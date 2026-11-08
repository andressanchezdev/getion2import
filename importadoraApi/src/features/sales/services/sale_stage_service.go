package services

// sale_stage_service · etapas del pedido: verificación, alistamiento, empaque, despacho, envío y cancelación
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/sales/dtos"
)

// AdvanceToVerification pasa el pedido a verificación.
func (s *SaleService) AdvanceToVerification(ctx context.Context, companyID, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "verificar"); err != nil {
		return err
	}
	if sale.CurrentStage != types.StageVerification {
		return nil // ya pasó la verificación: no se retrocede
	}

	if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageVerification, types.SaleOpen, &employeeID); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageVerification, employeeID, "verify"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// AdvanceToPicking pasa el pedido a alistamiento (picking).
func (s *SaleService) AdvanceToPicking(ctx context.Context, companyID, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "alistar"); err != nil {
		return err
	}
	if err := ensureStageFor(sale, "pick"); err != nil {
		return err
	}

	if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StagePicking, types.SaleOpen, &employeeID); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StagePicking, employeeID, "pick"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// AdvanceToPacking pasa el pedido a empaque.
func (s *SaleService) AdvanceToPacking(ctx context.Context, companyID, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "empacar"); err != nil {
		return err
	}
	if err := ensureStageFor(sale, "pack"); err != nil {
		return err
	}

	if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StagePacking, types.SaleOpen, &employeeID); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StagePacking, employeeID, "pack"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// AdvanceToDispatch despacha el pedido: descuenta el stock que estaba reservado, asienta el kardex y guarda la transportadora y la guía.
func (s *SaleService) AdvanceToDispatch(ctx context.Context, companyID, saleID, employeeID int64, req dtos.DispatchSaleRequest) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "despachar"); err != nil {
		return err
	}
	if err := ensureStageFor(sale, "dispatch"); err != nil {
		return err
	}

	items, err := s.saleRepo.ListItems(ctx, tx, saleID)
	if err != nil {
		return err
	}

	reason := fmt.Sprintf("Despacho pedido %s", sale.SerialCode)
	refType := "sale"
	for _, it := range items {
		if err := s.inventoryRepo.DeductStock(ctx, tx, it.StockID, it.Quantity, true); err != nil {
			return fmt.Errorf("error al descontar stock del ítem %s: %w", it.ProductCode, err)
		}

		movement := &inventoryrepos.AuditMovementEntity{
			CompanyID:     sale.CompanyID,
			StockID:       it.StockID,
			WarehouseID:   sale.WarehouseID,
			ProductID:     it.ProductID,
			EmployeeID:    &employeeID,
			MovementType:  types.MovementSaleOut,
			Quantity:      it.Quantity,
			ReferenceType: &refType,
			ReferenceID:   &sale.ID,
			Reason:        &reason,
		}
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
			return fmt.Errorf("error al asentar kardex de salida para ítem %s: %w", it.ProductCode, err)
		}
	}

	if req.CarrierID != nil || req.TrackingNo != nil {
		if err := s.saleRepo.UpdateCarrier(ctx, tx, saleID, req.CarrierID, req.TrackingNo); err != nil {
			return utils.NormalizeDBError(err, "No se pudo guardar la transportadora del despacho.")
		}
	}

	if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageDispatch, types.SaleOpen, &employeeID); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageDispatch, employeeID, "dispatch"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// AdvanceToSend marca el pedido como enviado.
func (s *SaleService) AdvanceToSend(ctx context.Context, companyID, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "enviar"); err != nil {
		return err
	}
	if err := ensureStageFor(sale, "send"); err != nil {
		return err
	}

	if err := s.saleRepo.MarkCompleted(ctx, tx, saleID); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageSent, employeeID, "send"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// CancelSale cancela el pedido y libera el stock que tenía reservado.
func (s *SaleService) CancelSale(ctx context.Context, companyID, saleID, employeeID int64, req dtos.CancelSaleRequest) error {
	if strings.TrimSpace(req.Reason) == "" {
		return utils.BadRequest("REASON_REQUIRED", "El motivo de cancelación es obligatorio.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if sale.Status == types.SaleCancelled {
		return utils.Conflict("SALE_CANCELLED", "El pedido ya está cancelado.")
	}
	if sale.Status == types.SaleCompleted || sale.CurrentStage == types.StageDispatch || sale.CurrentStage == types.StageSent {
		return utils.Conflict("SALE_ALREADY_DISPATCHED", "El pedido ya fue despachado o completado; para revertirlo usa una devolución.")
	}
	if verified, err := s.saleRepo.CountVerifiedPayments(ctx, tx, saleID); err != nil {
		return utils.NormalizeDBError(err, "No se pudieron revisar los pagos del pedido.")
	} else if verified > 0 {
		return utils.Conflict("SALE_HAS_PAYMENTS", "El pedido tiene pagos verificados; anúlalos o genera una devolución antes de cancelarlo.")
	}
	if invoices, err := s.saleRepo.CountInvoices(ctx, tx, saleID); err != nil {
		return utils.NormalizeDBError(err, "No se pudieron revisar las facturas del pedido.")
	} else if invoices > 0 {
		return utils.Conflict("SALE_HAS_INVOICE", "El pedido ya está facturado; para revertirlo usa una devolución.")
	}

	items, err := s.saleRepo.ListItems(ctx, tx, saleID)
	if err != nil {
		return err
	}

	for _, it := range items {
		if err := s.inventoryRepo.ReleaseReservation(ctx, tx, it.StockID, it.Quantity); err != nil {
			return fmt.Errorf("error al liberar stock reservado para ítem %s: %w", it.ProductCode, err)
		}
	}

	if err := s.saleRepo.Cancel(ctx, tx, saleID, employeeID, req.Reason); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
