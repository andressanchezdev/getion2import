package services

import (
	"context"
	"errors"
	"fmt"

	"importadoraApi/src/core/types"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/returns/dtos"
	"importadoraApi/src/features/returns/repositories"
	salerepos "importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReturnService struct {
	pool          *pgxpool.Pool
	returnRepo    *repositories.ReturnRepository
	saleRepo      *salerepos.SaleRepository
	inventoryRepo *inventoryrepos.InventoryRepository
}

func NewReturnService(
	pool *pgxpool.Pool,
	returnRepo *repositories.ReturnRepository,
	saleRepo *salerepos.SaleRepository,
	inventoryRepo *inventoryrepos.InventoryRepository,
) *ReturnService {
	return &ReturnService{
		pool:          pool,
		returnRepo:    returnRepo,
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
	}
}

func (s *ReturnService) Create(ctx context.Context, actorCompanyID *int64, actorEmployeeID int64, req dtos.CreateReturnRequest) (*dtos.ReturnResponse, error) {
	if req.SaleID <= 0 {
		return nil, errors.New("saleId es requerido")
	}
	if len(req.Items) == 0 {
		return nil, errors.New("debe incluir al menos un ítem a devolver")
	}
	if req.Reason == "" {
		return nil, errors.New("el motivo de devolución es obligatorio")
	}
	if req.ReasonType != types.ReturnReasonWarranty && req.ReasonType != types.ReturnReasonWrongItem {
		return nil, errors.New("el tipo de causal debe ser 'warranty' (garantía) o 'wrong_item' (error en envío)")
	}
	if req.ResolutionType != types.ReturnResolutionExchange && req.ResolutionType != types.ReturnResolutionCredit {
		return nil, errors.New("el tipo de resolución debe ser 'exchange' (cambio de repuesto) o 'credit_balance' (saldo a favor)")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, req.SaleID)
	if err != nil {
		return nil, err
	}
	if sale == nil {
		return nil, errors.New("la venta especificada no existe")
	}
	if actorCompanyID != nil && *actorCompanyID > 0 && sale.CompanyID != *actorCompanyID {
		return nil, errors.New("no tiene permisos sobre la venta especificada")
	}
	if sale.Status == types.SaleCancelled {
		return nil, errors.New("no se puede crear una devolución sobre una venta cancelada")
	}
	if sale.CustomerID == nil {
		return nil, errors.New("la venta no tiene cliente asociado para procesar la devolución")
	}

	saleItems, err := s.saleRepo.ListItems(ctx, tx, req.SaleID)
	if err != nil {
		return nil, err
	}
	saleItemsMap := make(map[int64]salerepos.SaleItemEntity)
	for _, si := range saleItems {
		saleItemsMap[si.ID] = salerepos.SaleItemEntity{
			ID:          si.ID,
			SaleID:      si.SaleID,
			ProductID:   si.ProductID,
			StockID:     si.StockID,
			ProductCode: si.ProductCode,
			ProductName: si.ProductName,
			Quantity:    si.Quantity,
			UnitPrice:   si.UnitPrice,
			UnitCost:    si.UnitCost,
		}
	}

	var grandTotal float64
	type itemToCreate struct {
		saleItemID int64
		quantity   int
		restock    bool
	}
	itemsToCreate := make([]itemToCreate, 0, len(req.Items))

	for _, itReq := range req.Items {
		si, exists := saleItemsMap[itReq.SaleItemID]
		if !exists {
			return nil, fmt.Errorf("el ítem %d no pertenece a la venta %s", itReq.SaleItemID, sale.SerialCode)
		}
		if itReq.Quantity <= 0 {
			return nil, errors.New("la cantidad devuelta debe ser mayor a 0")
		}
		if itReq.Quantity > si.Quantity {
			return nil, fmt.Errorf("la cantidad devuelta (%d) no puede superar la cantidad vendida (%d) para '%s'", itReq.Quantity, si.Quantity, si.ProductName)
		}

		restock := true
		if itReq.Restock != nil {
			restock = *itReq.Restock
		}

		grandTotal += float64(itReq.Quantity) * si.UnitPrice
		itemsToCreate = append(itemsToCreate, itemToCreate{
			saleItemID: itReq.SaleItemID,
			quantity:   itReq.Quantity,
			restock:    restock,
		})
	}

	var replacementProductID *int64
	var replacementStockID *int64
	if req.ResolutionType == types.ReturnResolutionExchange {
		if req.ReplacementStockID == nil || *req.ReplacementStockID <= 0 {
			return nil, errors.New("para resolución 'exchange' (cambio de repuesto) debe especificar replacementStockId")
		}
		var pID int64
		var avail, res int
		var pCode string
		err := tx.QueryRow(ctx, `
			SELECT s.product_id, s.available, s.reserved, p.code
			FROM stock s
			JOIN products p ON p.id = s.product_id
			WHERE s.id = $1 AND s.company_id = $2
		`, *req.ReplacementStockID, sale.CompanyID).Scan(&pID, &avail, &res, &pCode)
		if err != nil {
			return nil, fmt.Errorf("el stock de reemplazo ID %d no existe en la compañía: %w", *req.ReplacementStockID, err)
		}
		if (avail - res) < 1 {
			return nil, fmt.Errorf("el repuesto de reemplazo %s no cuenta con stock disponible suficiente", pCode)
		}
		replacementProductID = &pID
		replacementStockID = req.ReplacementStockID
	}

	retEntity := &repositories.ReturnEntity{
		CompanyID:            sale.CompanyID,
		SaleID:               sale.ID,
		CustomerID:           *sale.CustomerID,
		EmployeeID:           actorEmployeeID,
		Reason:               req.Reason,
		ReasonType:           req.ReasonType,
		ResolutionType:       req.ResolutionType,
		ReplacementProductID: replacementProductID,
		ReplacementStockID:   replacementStockID,
		Status:               types.ReturnPending,
		Total:                grandTotal,
	}

	createdRet, err := s.returnRepo.Create(ctx, tx, retEntity)
	if err != nil {
		return nil, fmt.Errorf("error al registrar encabezado de devolución: %w", err)
	}

	for _, it := range itemsToCreate {
		itemEntity := &repositories.ReturnItemEntity{
			ReturnID:   createdRet.ID,
			SaleItemID: it.saleItemID,
			Quantity:   it.quantity,
			Restock:    it.restock,
		}
		if err := s.returnRepo.CreateItem(ctx, tx, itemEntity); err != nil {
			return nil, fmt.Errorf("error al registrar ítem de devolución: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.FindByID(ctx, createdRet.ID)
}

func (s *ReturnService) FindByID(ctx context.Context, id int64) (*dtos.ReturnResponse, error) {
	ret, err := s.returnRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, err
	}
	if ret == nil {
		return nil, errors.New("devolución no encontrada")
	}

	rawItems, err := s.returnRepo.ListItems(ctx, s.pool, id)
	if err != nil {
		return nil, err
	}

	items := make([]dtos.ReturnItemResponse, 0, len(rawItems))
	for _, it := range rawItems {
		items = append(items, dtos.ReturnItemResponse{
			ID:          it.ID,
			ReturnID:    it.ReturnID,
			SaleItemID:  it.SaleItemID,
			ProductCode: it.ProductCode,
			ProductName: it.ProductName,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			LineTotal:   it.LineTotal,
			Restock:     it.Restock,
		})
	}

	return &dtos.ReturnResponse{
		ID:                     ret.ID,
		CompanyID:              ret.CompanyID,
		SaleID:                 ret.SaleID,
		SaleSerial:             ret.SaleSerial,
		CustomerID:             ret.CustomerID,
		CustomerName:           ret.CustomerName,
		EmployeeID:             ret.EmployeeID,
		EmployeeName:           ret.EmployeeName,
		ApprovedByEmployeeID:   ret.ApprovedByEmployeeID,
		ApprovedByName:         ret.ApprovedByName,
		Reason:                 ret.Reason,
		ReasonType:             ret.ReasonType,
		ResolutionType:         ret.ResolutionType,
		ReplacementProductID:   ret.ReplacementProductID,
		ReplacementStockID:     ret.ReplacementStockID,
		ReplacementProductCode: ret.ReplacementProductCode,
		ReplacementProductName: ret.ReplacementProductName,
		Status:                 ret.Status,
		Total:                  ret.Total,
		ApprovedAt:             ret.ApprovedAt,
		CreatedAt:              ret.CreatedAt,
		Items:                  items,
	}, nil
}

func (s *ReturnService) List(ctx context.Context, f dtos.ReturnFilterQuery) ([]dtos.ReturnResponse, int, error) {
	list, total, err := s.returnRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dtos.ReturnResponse, 0, len(list))
	for _, ret := range list {
		responses = append(responses, dtos.ReturnResponse{
			ID:                     ret.ID,
			CompanyID:              ret.CompanyID,
			SaleID:                 ret.SaleID,
			SaleSerial:             ret.SaleSerial,
			CustomerID:             ret.CustomerID,
			CustomerName:           ret.CustomerName,
			EmployeeID:             ret.EmployeeID,
			EmployeeName:           ret.EmployeeName,
			ApprovedByEmployeeID:   ret.ApprovedByEmployeeID,
			ApprovedByName:         ret.ApprovedByName,
			Reason:                 ret.Reason,
			ReasonType:             ret.ReasonType,
			ResolutionType:         ret.ResolutionType,
			ReplacementProductID:   ret.ReplacementProductID,
			ReplacementStockID:     ret.ReplacementStockID,
			ReplacementProductCode: ret.ReplacementProductCode,
			ReplacementProductName: ret.ReplacementProductName,
			Status:                 ret.Status,
			Total:                  ret.Total,
			ApprovedAt:             ret.ApprovedAt,
			CreatedAt:              ret.CreatedAt,
		})
	}

	return responses, total, nil
}

// Approve aprueba la devolución y, si corresponde, reingresa los ítems al inventario con movimiento Kardex
func (s *ReturnService) Approve(ctx context.Context, returnID, approverEmployeeID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	ret, err := s.returnRepo.FindByID(ctx, tx, returnID)
	if err != nil {
		return err
	}
	if ret == nil {
		return errors.New("devolución no encontrada")
	}
	if ret.Status != types.ReturnPending {
		return fmt.Errorf("la devolución ya se encuentra en estado '%s'", ret.Status)
	}

	items, err := s.returnRepo.ListItems(ctx, tx, returnID)
	if err != nil {
		return err
	}

	reason := fmt.Sprintf("Reingreso por devolución #%d sobre pedido %s", ret.ID, ret.SaleSerial)
	refType := "return"
	for _, it := range items {
		if it.Restock {
			// Reintegrar stock disponible
			_, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, ret.CompanyID, it.ProductID, it.WarehouseID, "", it.Quantity, 0)
			if err != nil {
				return fmt.Errorf("error al reintegrar stock del ítem %s: %w", it.ProductCode, err)
			}

			movement := &inventoryrepos.AuditMovementEntity{
				CompanyID:     ret.CompanyID,
				StockID:       it.StockID,
				WarehouseID:   it.WarehouseID,
				ProductID:     it.ProductID,
				EmployeeID:    &approverEmployeeID,
				MovementType:  types.MovementReturnIn,
				Quantity:      it.Quantity,
				ReferenceType: &refType,
				ReferenceID:   &ret.ID,
				Reason:        &reason,
			}
			if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
				return fmt.Errorf("error al asentar kardex de devolución para producto %s: %w", it.ProductCode, err)
			}
		}
	}

	// Aplicar la resolución acordada para la devolución
	if ret.ResolutionType == types.ReturnResolutionCredit {
		creditReason := fmt.Sprintf("Saldo a favor por devolución #%d sobre pedido %s (Causal: %s)", ret.ID, ret.SaleSerial, ret.ReasonType)
		const creditSQL = `
			INSERT INTO credit_entries (
				company_id, customer_id, employee_id, entry_type, amount, return_id, reason
			) VALUES (
				$1, $2, $3, 'return', $4, $5, $6
			)
		`
		if _, err := tx.Exec(ctx, creditSQL, ret.CompanyID, ret.CustomerID, approverEmployeeID, ret.Total, ret.ID, creditReason); err != nil {
			return fmt.Errorf("error al asentar saldo a favor en el crédito del cliente: %w", err)
		}
	} else if ret.ResolutionType == types.ReturnResolutionExchange && ret.ReplacementStockID != nil {
		var whID int64
		var pID int64
		var pCode string
		err := tx.QueryRow(ctx, `
			SELECT s.warehouse_id, s.product_id, p.code
			FROM stock s
			JOIN products p ON p.id = s.product_id
			WHERE s.id = $1
			FOR UPDATE
		`, *ret.ReplacementStockID).Scan(&whID, &pID, &pCode)
		if err != nil {
			return fmt.Errorf("error al consultar stock de reemplazo: %w", err)
		}

		tag, err := tx.Exec(ctx, `UPDATE stock SET available = available - 1 WHERE id = $1 AND available >= 1`, *ret.ReplacementStockID)
		if err != nil || tag.RowsAffected() == 0 {
			return fmt.Errorf("no hay stock disponible suficiente para despachar la pieza de reemplazo %s", pCode)
		}

		exchangeReason := fmt.Sprintf("Entrega de repuesto de reemplazo por devolución #%d", ret.ID)
		movement := &inventoryrepos.AuditMovementEntity{
			CompanyID:     ret.CompanyID,
			StockID:       *ret.ReplacementStockID,
			WarehouseID:   whID,
			ProductID:     pID,
			EmployeeID:    &approverEmployeeID,
			MovementType:  types.MovementAdjustment,
			Quantity:      -1,
			ReferenceType: &refType,
			ReferenceID:   &ret.ID,
			Reason:        &exchangeReason,
		}
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
			return fmt.Errorf("error al asentar kardex de repuesto entregado por reemplazo: %w", err)
		}
	}

	if err := s.returnRepo.Approve(ctx, tx, returnID, approverEmployeeID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// Reject rechaza la devolución sin modificar el stock
func (s *ReturnService) Reject(ctx context.Context, returnID, approverEmployeeID int64) error {
	return s.returnRepo.Reject(ctx, s.pool, returnID, approverEmployeeID)
}
