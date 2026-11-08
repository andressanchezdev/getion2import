package services

// purchase_payment_service.go · la caja de la bodega paga la recepción de compra: el pago queda como gasto del turno abierto (se ve en Facturas al cerrar la caja) y la orden suma lo pagado
// conecta con: PurchaseRepository (orden, turno de caja y gasto) y AuditRepository; lo llama purchase_controller
// ojo: solo se paga una recepción completa (estado «received») desde el turno abierto de la bodega que la recibió; la caja solo desembolsa efectivo y nunca se paga más del total de la orden

import (
	"context"
	"fmt"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/purchases/dtos"

	"github.com/jackc/pgx/v5"
)

// Pay registra el pago en efectivo de una recepción de compra desde el turno de caja abierto de su bodega.
func (s *PurchaseService) Pay(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.PayPurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.CashAmount <= 0 {
		return nil, utils.BadRequest("INVALID_AMOUNT", "El monto a pagar debe ser mayor a cero.")
	}
	purchase, err := s.purchaseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar la orden de compra.", err)
	}
	if purchase == nil {
		return nil, utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin && (actor.CompanyID == nil || *actor.CompanyID != purchase.CompanyID) {
		return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
	}
	// paga la caja de la bodega que recibió la mercancía
	if actor.ActorType == types.ActorEmployee && !employeeInWarehouse(actor, purchase.WarehouseID) {
		return nil, utils.Forbidden("FORBIDDEN_PURCHASE_WAREHOUSE", "Solo la caja de la bodega que recibió la compra puede pagarla.")
	}
	if purchase.Status != types.PurchaseReceived {
		return nil, utils.BadRequest("PURCHASE_NOT_RECEIVED", "Solo se paga una recepción completa: primero hay que recibir y validar la mercancía.")
	}
	pending := purchase.Total - purchase.PaidTotal
	if req.CashAmount > pending+0.005 {
		return nil, utils.BadRequest("EXCEEDS_PENDING", fmt.Sprintf("El pago supera lo pendiente de la orden (%.0f).", pending))
	}

	sessionID, err := s.purchaseRepo.FindOpenCashSession(ctx, s.pool, purchase.CompanyID, purchase.WarehouseID, string(actor.ActorType), actor.ActorID)
	if err != nil {
		return nil, utils.Internal("Error al consultar el turno de caja.", err)
	}
	if sessionID == 0 {
		return nil, utils.Conflict("NO_OPEN_CASH_SESSION", "Abre el turno de caja de esta bodega para pagar la recepción.")
	}

	receipt := req.ReceiptNumber
	if receipt == "" && purchase.SupplierRef != nil {
		receipt = *purchase.SupplierRef
	}
	concept := fmt.Sprintf("Recepción %s · %s", purchase.SerialCode, purchase.SupplierName)

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.purchaseRepo.InsertReceptionExpense(ctx, tx, sessionID, purchase.ID, receipt, concept, req.CashAmount); err != nil {
			return err
		}
		return s.purchaseRepo.AddPaidTotal(ctx, tx, purchase.ID, req.CashAmount)
	})
	if err != nil {
		return nil, utils.Internal("Error al registrar el pago de la recepción.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &purchase.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "purchases", EntityID: &purchase.ID, Action: "PURCHASE_PAID_BY_CASH",
		Reason: fmt.Sprintf("Caja pagó %.0f de la recepción %s", req.CashAmount, purchase.SerialCode), IPAddress: ip, UserAgent: ua,
	})
	return s.FindByID(ctx, actor, id)
}

// employeeInWarehouse dice si el empleado trabaja en esa bodega; un empleado sin bodega no está en ninguna
func employeeInWarehouse(actor *middlewares.ActorContext, warehouseID int64) bool {
	return actor.WarehouseID != nil && *actor.WarehouseID == warehouseID
}
