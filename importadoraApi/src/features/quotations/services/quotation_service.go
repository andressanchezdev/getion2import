package services

import (
	"context"
	"fmt"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	cartRepos "importadoraApi/src/features/carts/repositories"
	customerRepos "importadoraApi/src/features/customers/repositories"
	productRepos "importadoraApi/src/features/products/repositories"
	"importadoraApi/src/features/quotations/dtos"
	"importadoraApi/src/features/quotations/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuotationService struct {
	cfg           *config.Config
	pool          *pgxpool.Pool
	quotationRepo *repositories.QuotationRepository
	cartRepo      *cartRepos.CartRepository
	customerRepo  *customerRepos.CustomerRepository
	productRepo   *productRepos.ProductRepository
	auditRepo     *authRepos.AuditRepository
}

func NewQuotationService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	quotationRepo *repositories.QuotationRepository,
	cartRepo *cartRepos.CartRepository,
	customerRepo *customerRepos.CustomerRepository,
	productRepo *productRepos.ProductRepository,
	auditRepo *authRepos.AuditRepository,
) *QuotationService {
	return &QuotationService{
		cfg:           cfg,
		pool:          pool,
		quotationRepo: quotationRepo,
		cartRepo:      cartRepo,
		customerRepo:  customerRepo,
		productRepo:   productRepo,
		auditRepo:     auditRepo,
	}
}

func (s *QuotationService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.QuotationFilterQuery) ([]dtos.QuotationResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.quotationRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al consultar cotizaciones.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.QuotationResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapQuotationToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

func (s *QuotationService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.QuotationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	quo, err := s.quotationRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar cotización.", err)
	}
	if quo == nil {
		return nil, utils.NotFound("QUOTATION_NOT_FOUND", "La cotización solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != quo.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar esta cotización.")
		}
	}

	items, err := s.quotationRepo.ListItems(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems de la cotización.", err)
	}

	return s.mapQuotationToDTO(quo, items), nil
}

func (s *QuotationService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateQuotationRequest, ip, ua string) (*dtos.QuotationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := req.CompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El ID de compañía es requerido.")
	}

	// Validar cliente
	customer, err := s.customerRepo.FindByID(ctx, s.pool, req.CustomerID)
	if err != nil || customer == nil || customer.CompanyID != *companyID {
		return nil, utils.BadRequest("INVALID_CUSTOMER", "El cliente especificado no existe en la compañía.")
	}

	var validUntil *time.Time
	if req.ValidUntil != nil && *req.ValidUntil != "" {
		parsed, err := time.Parse("2006-01-02", *req.ValidUntil)
		if err == nil {
			validUntil = &parsed
		}
	}
	if validUntil == nil {
		def := time.Now().AddDate(0, 0, 15) // 15 días por defecto
		validUntil = &def
	}

	var createdQuo *repositories.QuotationEntity

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		serialCode, err := utils.NextSerialCode(ctx, tx, *companyID, nil, types.SeriesQuotation, "COT-")
		if err != nil {
			return err
		}

		// Preparar ítems a insertar
		type itemToInsert struct {
			productID  int64
			quantity   int
			unitPrice  float64
			discount   float64
			ivaPercent *float64
			lineTotal  float64
		}

		itemsList := make([]itemToInsert, 0)

		if req.CartID != nil {
			cartItems, err := s.cartRepo.ListItems(ctx, tx, *req.CartID)
			if err != nil {
				return err
			}
			for _, ci := range cartItems {
				prod, _ := s.productRepo.FindByID(ctx, tx, ci.ProductID)
				var ivaP *float64
				if prod != nil {
					ivaP = prod.IVA
				}
				itemsList = append(itemsList, itemToInsert{
					productID:  ci.ProductID,
					quantity:   ci.Quantity,
					unitPrice:  ci.UnitPrice,
					discount:   ci.Discount,
					ivaPercent: ivaP,
					lineTotal:  ci.LineTotal,
				})
			}
		} else {
			for _, it := range req.Items {
				prod, _ := s.productRepo.FindByID(ctx, tx, it.ProductID)
				if prod == nil || prod.CompanyID != *companyID {
					return utils.BadRequest("INVALID_PRODUCT", fmt.Sprintf("Producto ID %d no encontrado.", it.ProductID))
				}
				disc := 0.0
				if it.Discount != nil {
					disc = *it.Discount
				}
				ivaP := prod.IVA
				if it.IVAPercent != nil {
					ivaP = it.IVAPercent
				}
				lineTot := float64(it.Quantity)*it.UnitPrice - disc
				itemsList = append(itemsList, itemToInsert{
					productID:  it.ProductID,
					quantity:   it.Quantity,
					unitPrice:  it.UnitPrice,
					discount:   disc,
					ivaPercent: ivaP,
					lineTotal:  lineTot,
				})
			}
		}

		if len(itemsList) == 0 {
			return utils.BadRequest("NO_ITEMS", "La cotización debe contener al menos 1 producto.")
		}

		subtotal := 0.0
		discountTotal := 0.0
		ivaTotal := 0.0
		total := 0.0

		for _, it := range itemsList {
			subtotal += float64(it.quantity) * it.unitPrice
			discountTotal += it.discount
			ivaRate := 0.0
			if it.ivaPercent != nil {
				ivaRate = *it.ivaPercent / 100.0
			}
			ivaTotal += it.lineTotal * ivaRate
			total += it.lineTotal * (1.0 + ivaRate)
		}

		quoEntity := &repositories.QuotationEntity{
			CompanyID:     *companyID,
			SerialCode:    serialCode,
			CustomerID:    req.CustomerID,
			EmployeeID:    actor.ActorID,
			CartID:        req.CartID,
			Status:        types.QuotationDraft,
			ValidUntil:    validUntil,
			Subtotal:      subtotal,
			DiscountTotal: discountTotal,
			IVATotal:      ivaTotal,
			Total:         total,
			Notes:         req.Notes,
		}

		qCreated, err := s.quotationRepo.Create(ctx, tx, quoEntity)
		if err != nil {
			return err
		}
		createdQuo = qCreated

		for _, it := range itemsList {
			qItem := &repositories.QuotationItemEntity{
				QuotationID: qCreated.ID,
				ProductID:   it.productID,
				Quantity:    it.quantity,
				UnitPrice:   it.unitPrice,
				Discount:    it.discount,
				IVAPercent:  it.ivaPercent,
				LineTotal:   it.lineTotal,
			}
			if err := s.quotationRepo.CreateItem(ctx, tx, qItem); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "quotations",
		EntityID:  &createdQuo.ID,
		Action:    "QUOTATION_CREATED",
		Reason:    fmt.Sprintf("Creación de cotización %s", createdQuo.SerialCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	items, _ := s.quotationRepo.ListItems(ctx, s.pool, createdQuo.ID)
	return s.mapQuotationToDTO(createdQuo, items), nil
}

func (s *QuotationService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateQuotationRequest, ip, ua string) (*dtos.QuotationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	quo, err := s.quotationRepo.FindByID(ctx, s.pool, id)
	if err != nil || quo == nil {
		return nil, utils.NotFound("QUOTATION_NOT_FOUND", "La cotización no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != quo.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar esta cotización.")
		}
	}

	if req.Status != nil {
		quo.Status = *req.Status
	}
	if req.Notes != nil {
		quo.Notes = req.Notes
	}
	if req.ValidUntil != nil && *req.ValidUntil != "" {
		if parsed, err := time.Parse("2006-01-02", *req.ValidUntil); err == nil {
			quo.ValidUntil = &parsed
		}
	}

	if err := s.quotationRepo.Update(ctx, s.pool, quo); err != nil {
		return nil, utils.Internal("Error al actualizar cotización.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &quo.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "quotations",
		EntityID:  &quo.ID,
		Action:    "QUOTATION_UPDATED",
		Reason:    "Actualización de cotización",
		IPAddress: ip,
		UserAgent: ua,
	})

	items, _ := s.quotationRepo.ListItems(ctx, s.pool, id)
	return s.mapQuotationToDTO(quo, items), nil
}

func (s *QuotationService) mapQuotationToDTO(q *repositories.QuotationEntity, items []dtos.QuotationItemResponse) *dtos.QuotationResponse {
	var validUntilStr *string
	if q.ValidUntil != nil {
		formatted := q.ValidUntil.Format("2006-01-02")
		validUntilStr = &formatted
	}

	if items == nil {
		items = []dtos.QuotationItemResponse{}
	}

	return &dtos.QuotationResponse{
		ID:            q.ID,
		CompanyID:     q.CompanyID,
		SerialCode:    q.SerialCode,
		CustomerID:    q.CustomerID,
		CustomerName:  q.CustomerName,
		EmployeeID:    q.EmployeeID,
		EmployeeName:  q.EmployeeName,
		CartID:        q.CartID,
		SaleID:        q.SaleID,
		Status:        q.Status,
		ValidUntil:    validUntilStr,
		Subtotal:      q.Subtotal,
		DiscountTotal: q.DiscountTotal,
		IVATotal:      q.IVATotal,
		Total:         q.Total,
		Notes:         q.Notes,
		CreatedAt:     q.CreatedAt,
		UpdatedAt:     q.UpdatedAt,
		Items:         items,
	}
}
