package services

// payment_service.go · reglas de negocio de pagos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de pagos; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"fmt"
	"math"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/payments/dtos"
	"importadoraApi/src/features/payments/repositories"
	salerepos "importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentService struct {
	pool        *pgxpool.Pool
	paymentRepo *repositories.PaymentRepository
	saleRepo    *salerepos.SaleRepository
	auditRepo   *authRepos.AuditRepository
	events      *events.Recorder
}

// NewPaymentService crea el servicio con las piezas que necesita para funcionar.
func NewPaymentService(
	pool *pgxpool.Pool,
	paymentRepo *repositories.PaymentRepository,
	saleRepo *salerepos.SaleRepository,
	auditRepo *authRepos.AuditRepository,
	events *events.Recorder,
) *PaymentService {
	return &PaymentService{
		pool:        pool,
		paymentRepo: paymentRepo,
		saleRepo:    saleRepo,
		auditRepo:   auditRepo,
		events:      events,
	}
}

// Create crea el pago con las validaciones del negocio (compañía, duplicados y permisos).
func (s *PaymentService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreatePaymentRequest, ip, ua string) (*dtos.PaymentResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.SaleID <= 0 {
		return nil, utils.BadRequest("MISSING_SALE_ID", "El ID de la venta es requerido.")
	}
	if req.Amount <= 0 {
		return nil, utils.BadRequest("INVALID_AMOUNT", "El valor del pago debe ser mayor a cero.")
	}
	if req.Method != types.PaymentCash && req.Method != types.PaymentTransfer {
		return nil, utils.BadRequest("INVALID_METHOD", "El método de pago debe ser 'cash' (efectivo) o 'transfer' (transferencia bancaria).")
	}

	var createdID int64
	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		sale, err := s.saleRepo.FindByID(ctx, tx, req.SaleID)
		if err != nil {
			return utils.Internal("Error al consultar venta.", err)
		}
		if sale == nil {
			return utils.NotFound("SALE_NOT_FOUND", "La orden o venta no existe.")
		}

		if actor.ActorType != types.ActorSuperadmin {
			if actor.CompanyID == nil || *actor.CompanyID != sale.CompanyID {
				return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre la compañía de esta venta.")
			}
		}

		if sale.Status == types.SaleCancelled {
			return utils.BadRequest("SALE_CANCELLED", "No se pueden registrar pagos a una venta cancelada.")
		}
		if sale.CustomerID == nil {
			return utils.BadRequest("MISSING_CUSTOMER", "La venta no tiene un cliente asignado para registrar el recaudo.")
		}

		serialCode, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &sale.WarehouseID, types.SeriesPayment, "PAG-")
		if err != nil {
			return utils.Internal("Error al generar consecutivo de pago.", err)
		}

		empID, aerr := s.actorEmployeeID(ctx, actor)
		if aerr != nil {
			return aerr
		}
		if empID <= 0 {
			empID = sale.EmployeeID
		}

		entity := &repositories.PaymentEntity{
			CompanyID:  sale.CompanyID,
			SerialCode: serialCode,
			SaleID:     sale.ID,
			CustomerID: *sale.CustomerID,
			EmployeeID: empID,
			Method:     req.Method,
			Amount:     req.Amount,
			Status:     types.PaymentStatusReview, // Nace en revisión humana
			ProofURL:   req.ProofURL,
			Reference:  req.Reference,
			IssueNote:  req.Notes,
		}

		created, err := s.paymentRepo.Create(ctx, tx, entity)
		if err != nil {
			return utils.Internal("Error al guardar registro de pago.", err)
		}
		createdID = created.ID

		if err := s.recordPaymentCreated(ctx, tx, created.ID); err != nil {
			return err
		}

		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &sale.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "payments",
			EntityID:  &created.ID,
			Action:    "PAYMENT_SUBMITTED",
			Reason:    fmt.Sprintf("Pago registrado por $%.2f en estado de revisión humana", req.Amount),
			IPAddress: ip,
			UserAgent: ua,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.FindByID(ctx, actor, createdID)
}

// FindByID devuelve el pago por su id, validando que sea de la compañía del usuario.
func (s *PaymentService) FindByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.PaymentResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	p, err := s.paymentRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar pago.", err)
	}
	if p == nil {
		return nil, utils.NotFound("PAYMENT_NOT_FOUND", "El pago solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes acceso a los pagos de esta compañía.")
		}
	}

	return s.mapToDTO(p), nil
}

// List devuelve los pagos paginados según los filtros, limitados a lo que el usuario puede ver.
func (s *PaymentService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.PaymentFilterQuery) ([]dtos.PaymentResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.paymentRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar pagos.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.PaymentResponse, 0, len(list))
	for i := range list {
		resp = append(resp, *s.mapToDTO(&list[i]))
	}

	return resp, &meta, nil
}

// Verify aplica la verificación humana del pago e impacta el libro de crédito y el saldo de la venta.
func (s *PaymentService) Verify(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.VerifyPaymentRequest, ip, ua string) (*dtos.PaymentResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		p, err := s.paymentRepo.FindByID(ctx, tx, id)
		if err != nil {
			return utils.Internal("Error al consultar pago.", err)
		}
		if p == nil {
			return utils.NotFound("PAYMENT_NOT_FOUND", "El pago solicitado no existe.")
		}

		if actor.ActorType != types.ActorSuperadmin {
			if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
				return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este pago.")
			}
		}

		if p.Status != types.PaymentStatusReview {
			return utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El pago no se puede verificar porque ya está en estado '%s'.", p.Status))
		}

		verifierID, aerr := s.requireActorEmployeeID(ctx, actor)
		if aerr != nil {
			return aerr
		}
		// 1-3. verificado, suma a lo pagado de la venta y, si la venta es a crédito, abono en el libro de crédito
		if err := s.verifyInTx(ctx, tx, p, verifierID, req.IssueNote); err != nil {
			return utils.Internal("Error al verificar el pago.", err)
		}
		// si con este pago el pedido queda cubierto, pasa a «verificación confirmada»
		if err := s.syncVerificationStage(ctx, tx, p.SaleID, verifierID); err != nil {
			return utils.Internal("Error al actualizar la etapa del pedido.", err)
		}

		s.events.Record(ctx, events.NewPaymentStatusChanged(p.CompanyID, events.PaymentStatusChangedData{
			Entity: events.EntityRef{Kind: "payment", ID: p.ID, Version: time.Now().UTC()},
			From:   string(types.PaymentStatusReview),
			To:     string(types.PaymentStatusVerified),
		}))
		s.events.CashSessionTotalsOfPayment(ctx, tx, p.ID)

		if cov, err := s.paymentRepo.FindSaleCoverage(ctx, tx, p.SaleID); err == nil && cov != nil {
			s.events.Record(ctx, events.NewSalePaymentChanged(p.CompanyID, cov.WarehouseID, events.SalePaymentChangedData{
				SaleID:          p.SaleID,
				PaidTotal:       cov.PaidTotal,
				CreditAmount:    cov.CreditAmount,
				Balance:         math.Max(cov.Total-cov.PaidTotal-cov.CreditAmount, 0),
				PaymentVerified: cov.PaidTotal+cov.CreditAmount >= cov.Total-moneyTolerance && cov.ReviewCount == 0,
				Version:         time.Now().UTC(),
			}))
		}

		// 4. Registro de auditoría
		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &p.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "payments",
			EntityID:  &p.ID,
			Action:    "PAYMENT_VERIFIED",
			Reason:    fmt.Sprintf("Pago %s verificado exitosamente e imputado a cartera/venta", p.SerialCode),
			IPAddress: ip,
			UserAgent: ua,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.FindByID(ctx, actor, id)
}

// Void anula el pago impidiendo que impacte cartera.
func (s *PaymentService) Void(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.VoidPaymentRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	voidReason, verr := utils.ValidateReason(req.VoidReason)
	if verr != nil {
		return verr
	}

	p, err := s.paymentRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar pago.", err)
	}
	if p == nil {
		return utils.NotFound("PAYMENT_NOT_FOUND", "El pago solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este pago.")
		}
	}

	if p.Status != types.PaymentStatusReview {
		return utils.BadRequest("INVALID_STATUS", fmt.Sprintf("Solo se pueden anular pagos en revisión. Estado actual: '%s'.", p.Status))
	}

	// anular y reevaluar la etapa en la misma transacción: sin el pago en revisión el pedido puede quedar cubierto o no
	voiderID, aerr := s.requireActorEmployeeID(ctx, actor)
	if aerr != nil {
		return aerr
	}
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.paymentRepo.Void(ctx, tx, id, voiderID, voidReason); err != nil {
			return utils.Internal("Error al anular pago.", err)
		}
		if err := s.syncVerificationStage(ctx, tx, p.SaleID, voiderID); err != nil {
			return utils.Internal("Error al actualizar la etapa del pedido.", err)
		}
		s.events.Record(ctx, events.NewPaymentStatusChanged(p.CompanyID, events.PaymentStatusChangedData{
			Entity: events.EntityRef{Kind: "payment", ID: p.ID, Version: time.Now().UTC()},
			From:   string(types.PaymentStatusReview),
			To:     string(types.PaymentStatusVoided),
			Reason: &voidReason,
		}))
		s.events.CashSessionTotalsOfPayment(ctx, tx, p.ID)
		if cov, err := s.paymentRepo.FindSaleCoverage(ctx, tx, p.SaleID); err == nil && cov != nil {
			s.events.Record(ctx, events.NewSalePaymentChanged(p.CompanyID, cov.WarehouseID, events.SalePaymentChangedData{
				SaleID:          p.SaleID,
				PaidTotal:       cov.PaidTotal,
				CreditAmount:    cov.CreditAmount,
				Balance:         math.Max(cov.Total-cov.PaidTotal-cov.CreditAmount, 0),
				PaymentVerified: cov.PaidTotal+cov.CreditAmount >= cov.Total-moneyTolerance && cov.ReviewCount == 0,
				Version:         time.Now().UTC(),
			}))
		}
		return nil
	})
	if err != nil {
		return err
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "payments",
		EntityID:  &p.ID,
		Action:    "PAYMENT_VOIDED",
		Reason:    fmt.Sprintf("Pago %s anulado: %s", p.SerialCode, req.VoidReason),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// mapToDTO convierte el pago de la base en la respuesta que sale por la API.
func (s *PaymentService) mapToDTO(p *repositories.PaymentEntity) *dtos.PaymentResponse {
	return &dtos.PaymentResponse{
		ID:                   p.ID,
		CompanyID:            p.CompanyID,
		SerialCode:           p.SerialCode,
		SaleID:               p.SaleID,
		SaleSerial:           p.SaleSerial,
		CustomerID:           p.CustomerID,
		CustomerName:         p.CustomerName,
		EmployeeID:           p.EmployeeID,
		EmployeeName:         p.EmployeeName,
		VerifiedByEmployeeID: p.VerifiedByEmployeeID,
		VerifiedByName:       p.VerifiedByName,
		Method:               p.Method,
		Amount:               p.Amount,
		Status:               p.Status,
		ProofURL:             p.ProofURL,
		Reference:            p.Reference,
		IssueNote:            p.IssueNote,
		VoidReason:           p.VoidReason,
		VerifiedAt:           p.VerifiedAt,
		CreatedAt:            p.CreatedAt,
		WarehouseID:          p.WarehouseID,
		WarehouseCode:        p.WarehouseCode,
		WarehouseName:        p.WarehouseName,
	}
}

// recordPaymentCreated graba payment.created con la misma fila del historial de abonos (cliente, pedido, bodega y quién lo registró), leída en la transacción.
func (s *PaymentService) recordPaymentCreated(ctx context.Context, tx pgx.Tx, paymentID int64) error {
	row, err := s.paymentRepo.FindByID(ctx, tx, paymentID)
	if err != nil {
		return err
	}
	if row == nil {
		return utils.Internal("No se pudo leer el pago recién creado.", nil)
	}
	s.events.Record(ctx, events.NewPaymentCreated(row.CompanyID, s.mapToDTO(row)))
	// el pago queda ligado al turno abierto de su bodega: sus totales cambian
	s.events.CashSessionTotalsOfPayment(ctx, tx, row.ID)
	return nil
}
