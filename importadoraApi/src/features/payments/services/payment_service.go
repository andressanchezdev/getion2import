package services

import (
	"context"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/payments/dtos"
	"importadoraApi/src/features/payments/repositories"
	salerepos "importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentService struct {
	pool        *pgxpool.Pool
	paymentRepo *repositories.PaymentRepository
	saleRepo    *salerepos.SaleRepository
	auditRepo   *authRepos.AuditRepository
}

func NewPaymentService(
	pool *pgxpool.Pool,
	paymentRepo *repositories.PaymentRepository,
	saleRepo *salerepos.SaleRepository,
	auditRepo *authRepos.AuditRepository,
) *PaymentService {
	return &PaymentService{
		pool:        pool,
		paymentRepo: paymentRepo,
		saleRepo:    saleRepo,
		auditRepo:   auditRepo,
	}
}

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

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de pago.", err)
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, req.SaleID)
	if err != nil {
		return nil, utils.Internal("Error al consultar venta.", err)
	}
	if sale == nil {
		return nil, utils.NotFound("SALE_NOT_FOUND", "La orden o venta no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != sale.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre la compañía de esta venta.")
		}
	}

	if sale.Status == types.SaleCancelled {
		return nil, utils.BadRequest("SALE_CANCELLED", "No se pueden registrar pagos a una venta cancelada.")
	}
	if sale.CustomerID == nil {
		return nil, utils.BadRequest("MISSING_CUSTOMER", "La venta no tiene un cliente asignado para registrar el recaudo.")
	}

	serialCode, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &sale.WarehouseID, types.SeriesPayment, "PAG-")
	if err != nil {
		return nil, utils.Internal("Error al generar consecutivo de pago.", err)
	}

	empID := actor.ActorID
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
		return nil, utils.Internal("Error al guardar registro de pago.", err)
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

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar registro de pago.", err)
	}

	return s.FindByID(ctx, actor, created.ID)
}

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

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de verificación.", err)
	}
	defer tx.Rollback(ctx)

	p, err := s.paymentRepo.FindByID(ctx, tx, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar pago.", err)
	}
	if p == nil {
		return nil, utils.NotFound("PAYMENT_NOT_FOUND", "El pago solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este pago.")
		}
	}

	if p.Status != types.PaymentStatusReview {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("El pago no se puede verificar porque ya está en estado '%s'.", p.Status))
	}

	// 1. Cambiar estado a verified
	if err := s.paymentRepo.Verify(ctx, tx, id, actor.ActorID, req.IssueNote); err != nil {
		return nil, utils.Internal("Error al actualizar estado del pago.", err)
	}

	// 2. Incrementar paid_total en la venta
	const updateSaleSQL = `UPDATE sales SET paid_total = paid_total + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	if _, err := tx.Exec(ctx, updateSaleSQL, p.Amount, p.SaleID); err != nil {
		return nil, utils.Internal("Error al actualizar saldo abonado en la venta.", err)
	}

	// 3. Asentar abono positivo en credit_entries
	creditReason := fmt.Sprintf("Abono verificado por pago %s sobre venta %s", p.SerialCode, p.SaleSerial)
	const insertCreditSQL = `
		INSERT INTO credit_entries (
			company_id, customer_id, employee_id, entry_type, amount, sale_id, payment_id, reason
		) VALUES (
			$1, $2, $3, 'payment', $4, $5, $6, $7
		)
	`
	if _, err := tx.Exec(ctx, insertCreditSQL, p.CompanyID, p.CustomerID, actor.ActorID, p.Amount, p.SaleID, p.ID, creditReason); err != nil {
		return nil, utils.Internal("Error al asentar abono en el libro de crédito del cliente.", err)
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

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar verificación del pago.", err)
	}

	return s.FindByID(ctx, actor, id)
}

// Void anula el pago impidiendo que impacte cartera.
func (s *PaymentService) Void(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.VoidPaymentRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.VoidReason == "" {
		return utils.BadRequest("MISSING_REASON", "El motivo de anulación es obligatorio.")
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

	if err := s.paymentRepo.Void(ctx, s.pool, id, actor.ActorID, req.VoidReason); err != nil {
		return utils.Internal("Error al anular pago.", err)
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
	}
}
