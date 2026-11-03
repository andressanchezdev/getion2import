package services

// payment_flow_service · cobro mixto de un pedido (efectivo, transferencia y crédito en una operación) y paso automático de «verificación» a «verificación confirmada»
// conecta con: payment_service (Verify, Void), payment_flow_repo (cobertura del pedido), sale_repo (etapa e historial, crédito del cliente) y el controller de pagos
// ojo: el efectivo queda verificado en seguida y exige turno de caja abierto; la transferencia queda en revisión hasta conciliarla con el banco; el crédito no es un pago: es la parte que el cliente deja a deber
// ojo: el pedido pasa a verification_ok cuando lo verificado + lo dejado a crédito cubre el total y no queda ningún pago en revisión; si un pago en revisión se anula y eso lo deja descubierto, vuelve a verification

import (
	"context"
	"fmt"
	"math"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/payments/dtos"
	"importadoraApi/src/features/payments/repositories"

	"github.com/jackc/pgx/v5"
)

const moneyTolerance = 0.005 // medio centavo: los montos son NUMERIC(14,2)

// CreateBatch registra todos los pagos de un pedido en una sola operación.
func (s *PaymentService) CreateBatch(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreatePaymentsRequest, ip, ua string) (*dtos.PaymentsBatchResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.SaleID <= 0 {
		return nil, utils.BadRequest("MISSING_SALE_ID", "El ID de la venta es requerido.")
	}
	if len(req.Payments) == 0 {
		return nil, utils.BadRequest("MISSING_PAYMENTS", "Agrega al menos un pago.")
	}

	var sumLines, cashAmount, creditAmount float64
	for _, line := range req.Payments {
		if line.Amount <= 0 {
			return nil, utils.BadRequest("INVALID_AMOUNT", "Cada pago debe ser mayor a cero.")
		}
		switch line.Method {
		case types.PaymentCash:
			cashAmount += line.Amount
		case types.PaymentTransfer:
		case types.PaymentCredit:
			creditAmount += line.Amount
		default:
			return nil, utils.BadRequest("INVALID_METHOD", "El método de pago debe ser 'cash', 'transfer' o 'credit'.")
		}
		if line.Method == types.PaymentTransfer && (line.ProofURL == nil || *line.ProofURL == "") {
			return nil, utils.BadRequest("MISSING_PROOF", "La transferencia necesita la foto del comprobante.")
		}
		sumLines += line.Amount
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar la transacción del cobro.", err)
	}
	defer tx.Rollback(ctx)

	cov, err := s.paymentRepo.FindSaleCoverage(ctx, tx, req.SaleID)
	if err != nil {
		return nil, utils.Internal("Error al consultar el pedido.", err)
	}
	if cov == nil {
		return nil, utils.NotFound("SALE_NOT_FOUND", "La orden o venta no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin && (actor.CompanyID == nil || *actor.CompanyID != cov.CompanyID) {
		return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre la compañía de esta venta.")
	}
	if cov.Status == string(types.SaleCancelled) {
		return nil, utils.BadRequest("SALE_CANCELLED", "No se pueden registrar pagos a una venta cancelada.")
	}
	if cov.CustomerID == nil {
		return nil, utils.BadRequest("MISSING_CUSTOMER", "La venta no tiene un cliente asignado para registrar el cobro.")
	}

	pending := cov.Total - cov.PaidTotal - cov.CreditAmount - cov.ReviewAmount
	if sumLines > pending+moneyTolerance {
		return nil, utils.BadRequest("PAYMENT_EXCEEDS_BALANCE", fmt.Sprintf("Los pagos ($%.2f) superan lo que falta por cubrir del pedido ($%.2f).", sumLines, math.Max(pending, 0)))
	}

	if cashAmount > 0 {
		open, err := s.paymentRepo.HasOpenCashSession(ctx, tx, cov.WarehouseID)
		if err != nil {
			return nil, utils.Internal("Error al consultar el turno de caja.", err)
		}
		if !open {
			return nil, utils.Conflict("CASH_SESSION_CLOSED", "La caja de esta bodega está cerrada: abre el turno antes de recibir efectivo.")
		}
	}

	if creditAmount > 0 {
		info, err := s.saleRepo.GetCustomerCreditInfo(ctx, tx, *cov.CustomerID)
		if err != nil {
			return nil, utils.Internal("Error al consultar el crédito del cliente.", err)
		}
		if info == nil || !info.CreditEnabled {
			return nil, utils.BadRequest("CREDIT_NOT_ENABLED", "El cliente no tiene habilitada la línea de crédito.")
		}
		if creditAmount > info.AvailableCredit+moneyTolerance {
			return nil, utils.BadRequest("CREDIT_LIMIT_EXCEEDED", fmt.Sprintf("El crédito ($%.2f) excede el cupo disponible del cliente ($%.2f).", creditAmount, info.AvailableCredit))
		}
		if err := s.paymentRepo.MarkSaleCredit(ctx, tx, req.SaleID, cov.CreditAmount+creditAmount); err != nil {
			return nil, utils.Internal("Error al dejar la parte a crédito en el pedido.", err)
		}
	}

	sale, err := s.saleRepo.FindByID(ctx, tx, req.SaleID)
	if err != nil || sale == nil {
		return nil, utils.Internal("Error al consultar la venta.", err)
	}
	empID := actor.ActorID
	if empID <= 0 {
		empID = sale.EmployeeID
	}

	createdIDs := make([]int64, 0, len(req.Payments))
	for _, line := range req.Payments {
		if line.Method == types.PaymentCredit {
			continue
		}
		serial, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &sale.WarehouseID, types.SeriesPayment, "PAG-")
		if err != nil {
			return nil, utils.Internal("Error al generar consecutivo de pago.", err)
		}
		var note *string
		if line.Bank != nil && *line.Bank != "" {
			text := "Banco: " + *line.Bank
			note = &text
		}
		created, err := s.paymentRepo.Create(ctx, tx, &repositories.PaymentEntity{
			CompanyID: sale.CompanyID, SerialCode: serial, SaleID: sale.ID, CustomerID: *sale.CustomerID, EmployeeID: empID,
			Method: line.Method, Amount: line.Amount, Status: types.PaymentStatusReview, ProofURL: line.ProofURL, Reference: line.Reference, IssueNote: note,
		})
		if err != nil {
			return nil, utils.Internal("Error al guardar el pago.", err)
		}
		if line.Method == types.PaymentCash {
			if err := s.verifyInTx(ctx, tx, created, actor.ActorID, nil); err != nil {
				return nil, utils.Internal("Error al verificar el pago en efectivo.", err)
			}
		}
		createdIDs = append(createdIDs, created.ID)
		_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &sale.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
			Entity: "payments", EntityID: &created.ID, Action: "PAYMENT_SUBMITTED",
			Reason: fmt.Sprintf("Cobro mixto: %s por $%.2f", line.Method, line.Amount), IPAddress: ip, UserAgent: ua,
		})
	}

	if err := s.syncVerificationStage(ctx, tx, req.SaleID, actor.ActorID); err != nil {
		return nil, utils.Internal("Error al actualizar la etapa del pedido.", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar el cobro.", err)
	}

	result := &dtos.PaymentsBatchResponse{Payments: make([]dtos.PaymentResponse, 0, len(createdIDs))}
	for _, id := range createdIDs {
		if p, err := s.FindByID(ctx, actor, id); err == nil {
			result.Payments = append(result.Payments, *p)
		}
	}
	after, err := s.paymentRepo.FindSaleCoverage(ctx, s.pool, req.SaleID)
	if err == nil && after != nil {
		result.Stage = after.Stage
		result.PaidTotal = after.PaidTotal
		result.CreditAmount = after.CreditAmount
		result.Balance = math.Max(after.Total-after.PaidTotal-after.CreditAmount, 0)
	}
	return result, nil
}

// verifyInTx verifica un pago dentro de una transacción: lo marca verificado, suma a lo pagado del pedido y, si la venta es a crédito, asienta el abono en el libro del cliente.
// ojo: en una venta de contado el pago NO se asienta en el libro de crédito (antes se asentaba y dejaba saldo a favor que no existe)
func (s *PaymentService) verifyInTx(ctx context.Context, tx pgx.Tx, p *repositories.PaymentEntity, actorID int64, note *string) error {
	if err := s.paymentRepo.Verify(ctx, tx, p.ID, actorID, note); err != nil {
		return err
	}
	if err := s.paymentRepo.AddPaidToSale(ctx, tx, p.SaleID, p.Amount); err != nil {
		return err
	}
	cov, err := s.paymentRepo.FindSaleCoverage(ctx, tx, p.SaleID)
	if err != nil {
		return err
	}
	if cov != nil && cov.PaymentMethod == string(types.PaymentCredit) {
		reason := fmt.Sprintf("Abono verificado por pago %s", p.SerialCode)
		return s.paymentRepo.InsertCreditEntry(ctx, tx, p.CompanyID, p.CustomerID, actorID, p.Amount, p.SaleID, p.ID, reason)
	}
	return nil
}

// syncVerificationStage lleva el pedido entre verification y verification_ok según su pago: cubierto (verificado + crédito) y sin pagos en revisión = confirmado.
func (s *PaymentService) syncVerificationStage(ctx context.Context, tx pgx.Tx, saleID, actorID int64) error {
	cov, err := s.paymentRepo.FindSaleCoverage(ctx, tx, saleID)
	if err != nil || cov == nil || cov.Status != string(types.SaleOpen) {
		return err
	}
	covered := cov.PaidTotal+cov.CreditAmount >= cov.Total-moneyTolerance && cov.ReviewCount == 0
	var actor *int64
	if actorID > 0 {
		actor = &actorID
	}
	switch {
	case covered && cov.Stage == string(types.StageVerification):
		return s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageVerificationOK, types.SaleOpen, actor)
	case !covered && cov.Stage == string(types.StageVerificationOK):
		return s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageVerification, types.SaleOpen, actor)
	}
	return nil
}
