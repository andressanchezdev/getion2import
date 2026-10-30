package services

import (
	"context"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	customerrepos "importadoraApi/src/features/customers/repositories"
	"importadoraApi/src/features/wallet/dtos"
	"importadoraApi/src/features/wallet/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type WalletService struct {
	pool         *pgxpool.Pool
	walletRepo   *repositories.WalletRepository
	customerRepo *customerrepos.CustomerRepository
	auditRepo    *authRepos.AuditRepository
}

func NewWalletService(
	pool *pgxpool.Pool,
	walletRepo *repositories.WalletRepository,
	customerRepo *customerrepos.CustomerRepository,
	auditRepo *authRepos.AuditRepository,
) *WalletService {
	return &WalletService{
		pool:         pool,
		walletRepo:   walletRepo,
		customerRepo: customerRepo,
		auditRepo:    auditRepo,
	}
}

func (s *WalletService) GetCustomerSummary(ctx context.Context, actor *middlewares.ActorContext, customerID int64) (*dtos.CustomerCreditSummaryResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cust, err := s.customerRepo.FindByID(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if cust == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cust.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre la cartera de este cliente.")
		}
	}

	summary, err := s.walletRepo.GetCustomerCreditSummary(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar estado de crédito del cliente.", err)
	}
	if summary == nil {
		return nil, utils.NotFound("SUMMARY_NOT_FOUND", "No se encontró resumen de crédito para el cliente.")
	}

	return &dtos.CustomerCreditSummaryResponse{
		CustomerID:      summary.CustomerID,
		CompanyID:       summary.CompanyID,
		Document:        summary.Document,
		CustomerName:    summary.CustomerName,
		CreditEnabled:   summary.CreditEnabled,
		CreditLimit:     summary.CreditLimit,
		CreditDays:      summary.CreditDays,
		CreditBalance:   summary.CreditBalance,
		ReservedOrders:  summary.ReservedOrders,
		AvailableCredit: summary.AvailableCredit,
	}, nil
}

func (s *WalletService) ListEntries(ctx context.Context, actor *middlewares.ActorContext, f dtos.CreditEntryFilterQuery) ([]dtos.CreditEntryResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.walletRepo.ListEntries(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar asientos de crédito.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.CreditEntryResponse, 0, len(list))
	for _, it := range list {
		resp = append(resp, dtos.CreditEntryResponse{
			ID:            it.ID,
			CompanyID:     it.CompanyID,
			CustomerID:    it.CustomerID,
			CustomerName:  it.CustomerName,
			EmployeeID:    it.EmployeeID,
			EmployeeName:  it.EmployeeName,
			EntryType:     it.EntryType,
			Amount:        it.Amount,
			SaleID:        it.SaleID,
			SaleSerial:    it.SaleSerial,
			PaymentID:     it.PaymentID,
			PaymentSerial: it.PaymentSerial,
			ReturnID:      it.ReturnID,
			Reason:        it.Reason,
			CreatedAt:     it.CreatedAt,
		})
	}

	return resp, &meta, nil
}

func (s *WalletService) CreateAdjustment(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCreditAdjustmentRequest, ip, ua string) (*dtos.CustomerCreditSummaryResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.CustomerID <= 0 {
		return nil, utils.BadRequest("MISSING_CUSTOMER_ID", "El ID de cliente es requerido.")
	}
	if req.Amount == 0 {
		return nil, utils.BadRequest("INVALID_AMOUNT", "El monto de ajuste no puede ser cero.")
	}
	if req.Reason == "" {
		return nil, utils.BadRequest("MISSING_REASON", "El motivo del ajuste contable es obligatorio.")
	}

	cust, err := s.customerRepo.FindByID(ctx, s.pool, req.CustomerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if cust == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != cust.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre la cartera de este cliente.")
		}
	}

	var empID *int64
	if actor.ActorID > 0 {
		empID = &actor.ActorID
	}

	adjID, err := s.walletRepo.CreateAdjustment(ctx, s.pool, cust.CompanyID, cust.ID, empID, req.Amount, req.Reason)
	if err != nil {
		return nil, utils.Internal("Error al registrar ajuste en el libro de crédito.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &cust.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "credit_entries",
		EntityID:  &adjID,
		Action:    "CREDIT_ADJUSTMENT",
		Reason:    fmt.Sprintf("Ajuste de crédito aplicado a cliente %s por $%.2f. Motivo: %s", cust.Name, req.Amount, req.Reason),
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.GetCustomerSummary(ctx, actor, cust.ID)
}

