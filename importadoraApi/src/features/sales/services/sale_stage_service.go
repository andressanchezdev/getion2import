package services

// sale_stage_service · etapas del pedido: verificación, alistamiento, empaque, despacho, envío y cancelación
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"
	"errors"
	"fmt"

	"importadoraApi/src/core/types"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/sales/dtos"
)

// AdvanceToVerification pasa el pedido a verificación.
func (s *SaleService) AdvanceToVerification(ctx context.Context, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled || sale.Status == types.SaleCompleted {
		return fmt.Errorf("no se puede avanzar una venta con estado '%s'", sale.Status)
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
func (s *SaleService) AdvanceToPicking(ctx context.Context, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled || sale.Status == types.SaleCompleted {
		return fmt.Errorf("no se puede avanzar una venta con estado '%s'", sale.Status)
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
func (s *SaleService) AdvanceToPacking(ctx context.Context, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled || sale.Status == types.SaleCompleted {
		return fmt.Errorf("no se puede avanzar una venta con estado '%s'", sale.Status)
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
func (s *SaleService) AdvanceToDispatch(ctx context.Context, saleID, employeeID int64, req dtos.DispatchSaleRequest) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled || sale.Status == types.SaleCompleted {
		return fmt.Errorf("no se puede despachar una venta con estado '%s'", sale.Status)
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
		_ = s.saleRepo.UpdateCarrier(ctx, tx, saleID, req.CarrierID, req.TrackingNo)
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
func (s *SaleService) AdvanceToSend(ctx context.Context, saleID, employeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return err
	}
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled {
		return errors.New("no se puede enviar una venta cancelada")
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
func (s *SaleService) CancelSale(ctx context.Context, saleID, employeeID int64, req dtos.CancelSaleRequest) error {
	if req.Reason == "" {
		return errors.New("el motivo de cancelación es obligatorio")
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
	if sale == nil {
		return errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled {
		return errors.New("la venta ya se encuentra cancelada")
	}
	if sale.Status == types.SaleCompleted || sale.CurrentStage == types.StageDispatch || sale.CurrentStage == types.StageSent {
		return errors.New("no se puede cancelar una venta que ya ha sido despachada o completada. Use el módulo de devoluciones")
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
