package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SaleService struct {
	pool          *pgxpool.Pool
	saleRepo      *repositories.SaleRepository
	inventoryRepo *inventoryrepos.InventoryRepository
}

func NewSaleService(pool *pgxpool.Pool, saleRepo *repositories.SaleRepository, inventoryRepo *inventoryrepos.InventoryRepository) *SaleService {
	return &SaleService{
		pool:          pool,
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
	}
}

func (s *SaleService) Create(ctx context.Context, actorCompanyID *int64, actorEmployeeID int64, req dtos.CreateSaleRequest) (*dtos.SaleResponse, error) {
	companyID := int64(1)
	if actorCompanyID != nil && *actorCompanyID > 0 {
		companyID = *actorCompanyID
	} else if req.CompanyID != nil && *req.CompanyID > 0 {
		companyID = *req.CompanyID
	}

	if req.WarehouseID <= 0 {
		return nil, errors.New("warehouseId es requerido")
	}

	if len(req.Items) == 0 {
		return nil, errors.New("la venta o pedido debe tener al menos un ítem")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Validar límite de crédito si la venta es a crédito
	isCredit := req.PaymentCondition != nil && *req.PaymentCondition == types.ConditionCredit
	if isCredit && req.CustomerID == nil {
		return nil, errors.New("para ventas a crédito se requiere asignar un cliente")
	}

	type itemComputed struct {
		stockID      int64
		productID    int64
		productCode  string
		productName  string
		priceTier    types.PriceTier
		quantity     int
		unitPrice    float64
		unitCost     float64
		discount     float64
		ivaPercent   *float64
		ivaAmount    float64
		subtotal     float64
		lineTotal    float64
	}

	computedItems := make([]itemComputed, 0, len(req.Items))
	var grandSubtotal, grandDiscount, grandIVA, grandTotal float64

	customerTier := types.PriceTierP1
	if req.PriceTier != nil {
		customerTier = *req.PriceTier
	}

	for _, itemReq := range req.Items {
		if itemReq.Quantity <= 0 {
			return nil, errors.New("la cantidad debe ser mayor a 0")
		}

		const stockSql = `
			SELECT s.id, s.product_id, s.warehouse_id, s.available, s.reserved,
			       p.code, p.name, p.last_cost, COALESCE(p.iva, 0),
			       COALESCE((SELECT jsonb_object_agg(pp.price_tier, pp.price) FROM product_prices pp WHERE pp.product_id = p.id), '{}'::jsonb) AS prices
			FROM stock s
			JOIN products p ON p.id = s.product_id
			WHERE s.id = $1 AND s.warehouse_id = $2
			FOR UPDATE
		`
		var stID, prodID, whID int64
		var avail, res int
		var pCode, pName string
		var costPrice, ivaRate float64
		var pricesRaw []byte

		err := tx.QueryRow(ctx, stockSql, itemReq.StockID, req.WarehouseID).Scan(
			&stID, &prodID, &whID, &avail, &res,
			&pCode, &pName, &costPrice, &ivaRate, &pricesRaw,
		)
		if err != nil {
			return nil, fmt.Errorf("stock ID %d no encontrado o no pertenece a la bodega %d: %w", itemReq.StockID, req.WarehouseID, err)
		}

		sellable := avail - res
		if sellable < itemReq.Quantity {
			return nil, fmt.Errorf("stock insuficiente para el producto '%s' (código %s). Disponible para venta: %d, solicitado: %d", pName, pCode, sellable, itemReq.Quantity)
		}

		unitPrice := 0.0
		if itemReq.UnitPrice != nil && *itemReq.UnitPrice > 0 {
			unitPrice = *itemReq.UnitPrice
		} else {
			var pricesMap map[string]float64
			if len(pricesRaw) > 0 {
				_ = json.Unmarshal(pricesRaw, &pricesMap)
			}
			tierKey := string(customerTier)
			if val, ok := pricesMap[tierKey]; ok && val > 0 {
				unitPrice = val
			} else if valP1, ok := pricesMap[string(types.PriceTierP1)]; ok && valP1 > 0 {
				unitPrice = valP1
			} else {
				unitPrice = costPrice * 1.30
			}
		}

		discount := 0.0
		if itemReq.Discount != nil && *itemReq.Discount >= 0 {
			discount = *itemReq.Discount
		}

		ivaPct := ivaRate
		if itemReq.IVAPercent != nil && *itemReq.IVAPercent >= 0 {
			ivaPct = *itemReq.IVAPercent
		}

		lineSubtotal := float64(itemReq.Quantity) * unitPrice
		lineDiscount := lineSubtotal * (discount / 100.0)
		baseTaxable := lineSubtotal - lineDiscount
		lineIVA := baseTaxable * (ivaPct / 100.0)
		lineTotal := baseTaxable + lineIVA

		grandSubtotal += lineSubtotal
		grandDiscount += lineDiscount
		grandIVA += lineIVA
		grandTotal += lineTotal

		computedItems = append(computedItems, itemComputed{
			stockID:     stID,
			productID:   prodID,
			productCode: pCode,
			productName: pName,
			priceTier:   customerTier,
			quantity:    itemReq.Quantity,
			unitPrice:   unitPrice,
			unitCost:    costPrice,
			discount:    discount,
			ivaPercent:  &ivaPct,
			ivaAmount:   lineIVA,
			subtotal:    lineSubtotal,
			lineTotal:   lineTotal,
		})
	}

	if isCredit && req.CustomerID != nil {
		creditInfo, err := s.saleRepo.GetCustomerCreditInfo(ctx, tx, *req.CustomerID)
		if err != nil {
			return nil, fmt.Errorf("error al verificar crédito del cliente: %w", err)
		}
		if creditInfo == nil || !creditInfo.CreditEnabled {
			return nil, errors.New("el cliente no tiene habilitada la línea de crédito")
		}
		if grandTotal > creditInfo.AvailableCredit {
			return nil, fmt.Errorf("el total de la orden ($%.2f) excede el crédito disponible ($%.2f) del cliente", grandTotal, creditInfo.AvailableCredit)
		}
	}

	whID := req.WarehouseID
	serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &whID, types.SeriesSale, "PED-")
	if err != nil {
		return nil, fmt.Errorf("error al generar consecutivo de venta: %w", err)
	}

	immediatePicking := false
	if req.ImmediatePicking != nil {
		immediatePicking = *req.ImmediatePicking
	}

	initialStage := types.StageVerification
	if immediatePicking {
		initialStage = types.StagePicking
	}

	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		if t, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			dueDate = &t
		}
	}

	effectiveEmployeeID := actorEmployeeID
	if req.SalespersonEmployeeID != nil && *req.SalespersonEmployeeID > 0 {
		var exists bool
		err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1 AND company_id = $2 AND status = 'active')", *req.SalespersonEmployeeID, companyID).Scan(&exists)
		if err != nil {
			return nil, fmt.Errorf("error al verificar empleado vendedor: %w", err)
		}
		if !exists {
			return nil, errors.New("el empleado asignado como vendedor no existe o no está activo en la compañía")
		}
		effectiveEmployeeID = *req.SalespersonEmployeeID
	}

	saleEntity := &repositories.SaleEntity{
		CompanyID:        companyID,
		SerialCode:       serialCode,
		CustomerID:       req.CustomerID,
		EmployeeID:       effectiveEmployeeID,
		WarehouseID:      req.WarehouseID,
		CartID:           req.CartID,
		PriceTier:        customerTier,
		PaymentMethod:    req.PaymentMethod,
		PaymentCondition: req.PaymentCondition,
		ImmediatePicking: immediatePicking,
		Status:           types.SaleOpen,
		CurrentStage:     initialStage,
		Subtotal:         grandSubtotal,
		DiscountTotal:    grandDiscount,
		IVATotal:         grandIVA,
		Total:            grandTotal,
		PaidTotal:        0,
		DueDate:          dueDate,
		ShippingAddress:  req.ShippingAddress,
		CarrierID:        req.CarrierID,
		TrackingNo:       req.TrackingNo,
		Notes:            req.Notes,
	}

	createdSale, err := s.saleRepo.Create(ctx, tx, saleEntity)
	if err != nil {
		return nil, fmt.Errorf("error al guardar pedido de venta: %w", err)
	}

	for _, it := range computedItems {
		itemEntity := &repositories.SaleItemEntity{
			SaleID:       createdSale.ID,
			ProductID:    it.productID,
			StockID:      it.stockID,
			ProductCode:  it.productCode,
			ProductName:  it.productName,
			PriceTier:    it.priceTier,
			Quantity:     it.quantity,
			UnitPrice:    it.unitPrice,
			UnitCost:     it.unitCost,
			Discount:     it.discount,
			IVAPercent:   it.ivaPercent,
			IVAAmount:    it.ivaAmount,
			Subtotal:     it.subtotal,
			LineTotal:    it.lineTotal,
			ProcessStage: initialStage,
			StageStatus:  types.StageStatusPending,
		}

		if err := s.saleRepo.CreateItem(ctx, tx, itemEntity); err != nil {
			return nil, fmt.Errorf("error al guardar ítem de venta: %w", err)
		}

		if err := s.inventoryRepo.ReserveStock(ctx, tx, it.stockID, it.quantity); err != nil {
			return nil, fmt.Errorf("error al reservar stock para producto %s: %w", it.productCode, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.FindByID(ctx, createdSale.ID)
}

func (s *SaleService) FindByID(ctx context.Context, id int64) (*dtos.SaleResponse, error) {
	entity, err := s.saleRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return nil, errors.New("venta no encontrada")
	}

	items, err := s.saleRepo.ListItems(ctx, s.pool, id)
	if err != nil {
		return nil, err
	}

	invFilter := dtos.InvoiceFilterQuery{SaleID: &id}
	invoices, _, err := s.saleRepo.ListInvoices(ctx, s.pool, invFilter)
	if err != nil {
		return nil, err
	}

	invResponses := make([]dtos.InvoiceResponse, 0, len(invoices))
	for _, inv := range invoices {
		invResponses = append(invResponses, dtos.InvoiceResponse{
			ID:                     inv.ID,
			CompanyID:              inv.CompanyID,
			WarehouseID:            inv.WarehouseID,
			WarehouseName:          inv.WarehouseName,
			WarehouseFacturationID: inv.WarehouseFacturationID,
			SaleID:                 inv.SaleID,
			SaleSerial:             inv.SaleSerial,
			ReturnID:               inv.ReturnID,
			EmployeeID:             inv.EmployeeID,
			EmployeeName:           inv.EmployeeName,
			Kind:                   inv.Kind,
			Number:                 inv.Number,
			Status:                 inv.Status,
			PDFURL:                 inv.PDFURL,
			IssuedAt:               inv.IssuedAt,
			CreatedAt:              inv.CreatedAt,
		})
	}

	var dueDateStr *string
	if entity.DueDate != nil {
		ds := entity.DueDate.Format("2006-01-02")
		dueDateStr = &ds
	}

	return &dtos.SaleResponse{
		ID:                    entity.ID,
		CompanyID:             entity.CompanyID,
		SerialCode:            entity.SerialCode,
		CustomerID:            entity.CustomerID,
		CustomerName:          entity.CustomerName,
		EmployeeID:            entity.EmployeeID,
		EmployeeName:          entity.EmployeeName,
		WarehouseID:           entity.WarehouseID,
		WarehouseName:         entity.WarehouseName,
		CartID:                entity.CartID,
		PriceTier:             entity.PriceTier,
		PaymentMethod:         entity.PaymentMethod,
		PaymentCondition:      entity.PaymentCondition,
		ImmediatePicking:      entity.ImmediatePicking,
		Status:                entity.Status,
		CurrentStage:          entity.CurrentStage,
		Subtotal:              entity.Subtotal,
		DiscountTotal:         entity.DiscountTotal,
		IVATotal:              entity.IVATotal,
		Total:                 entity.Total,
		PaidTotal:             entity.PaidTotal,
		SaleAt:                entity.SaleAt,
		DueDate:               dueDateStr,
		ShippingAddress:       entity.ShippingAddress,
		CarrierID:             entity.CarrierID,
		CarrierName:           entity.CarrierName,
		TrackingNo:            entity.TrackingNo,
		CancelReason:          entity.CancelReason,
		CancelledByEmployeeID: entity.CancelledByEmployeeID,
		CancelledByName:       entity.CancelledByName,
		Notes:                 entity.Notes,
		CreatedAt:             entity.CreatedAt,
		UpdatedAt:             entity.UpdatedAt,
		Items:                 items,
		Invoices:              invResponses,
	}, nil
}

func (s *SaleService) List(ctx context.Context, f dtos.SaleFilterQuery) ([]dtos.SaleResponse, int, error) {
	list, total, err := s.saleRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dtos.SaleResponse, 0, len(list))
	for _, entity := range list {
		var dueDateStr *string
		if entity.DueDate != nil {
			ds := entity.DueDate.Format("2006-01-02")
			dueDateStr = &ds
		}
		responses = append(responses, dtos.SaleResponse{
			ID:                    entity.ID,
			CompanyID:             entity.CompanyID,
			SerialCode:            entity.SerialCode,
			CustomerID:            entity.CustomerID,
			CustomerName:          entity.CustomerName,
			EmployeeID:            entity.EmployeeID,
			EmployeeName:          entity.EmployeeName,
			WarehouseID:           entity.WarehouseID,
			WarehouseName:         entity.WarehouseName,
			CartID:                entity.CartID,
			PriceTier:             entity.PriceTier,
			PaymentMethod:         entity.PaymentMethod,
			PaymentCondition:      entity.PaymentCondition,
			ImmediatePicking:      entity.ImmediatePicking,
			Status:                entity.Status,
			CurrentStage:          entity.CurrentStage,
			Subtotal:              entity.Subtotal,
			DiscountTotal:         entity.DiscountTotal,
			IVATotal:              entity.IVATotal,
			Total:                 entity.Total,
			PaidTotal:             entity.PaidTotal,
			SaleAt:                entity.SaleAt,
			DueDate:               dueDateStr,
			ShippingAddress:       entity.ShippingAddress,
			CarrierID:             entity.CarrierID,
			CarrierName:           entity.CarrierName,
			TrackingNo:            entity.TrackingNo,
			CancelReason:          entity.CancelReason,
			CancelledByEmployeeID: entity.CancelledByEmployeeID,
			CancelledByName:       entity.CancelledByName,
			Notes:                 entity.Notes,
			CreatedAt:             entity.CreatedAt,
			UpdatedAt:             entity.UpdatedAt,
		})
	}
	return responses, total, nil
}

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

	if err := s.saleRepo.UpdateStage(ctx, tx, saleID, types.StageVerification, types.SaleOpen); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageVerification, employeeID, "verify"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

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

	if err := s.saleRepo.UpdateStage(ctx, tx, saleID, types.StagePicking, types.SaleOpen); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StagePicking, employeeID, "pick"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

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

	if err := s.saleRepo.UpdateStage(ctx, tx, saleID, types.StagePacking, types.SaleOpen); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StagePacking, employeeID, "pack"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *SaleService) IssueInvoice(ctx context.Context, saleID, employeeID int64) (*dtos.InvoiceResponse, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
	if err != nil {
		return nil, err
	}
	if sale == nil {
		return nil, errors.New("venta no encontrada")
	}
	if sale.Status == types.SaleCancelled {
		return nil, errors.New("no se puede facturar una venta cancelada")
	}

	whFactID, err := s.saleRepo.FindWarehouseFacturation(ctx, tx, sale.WarehouseID)
	if err != nil {
		return nil, fmt.Errorf("la bodega %d no tiene configuración de facturación activa: %w", sale.WarehouseID, err)
	}

	whID := sale.WarehouseID
	invNumber, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &whID, types.SeriesInvoice, "FAC-")
	if err != nil {
		return nil, fmt.Errorf("error al obtener consecutivo de factura: %w", err)
	}

	invEntity := &repositories.InvoiceEntity{
		CompanyID:              sale.CompanyID,
		WarehouseID:            sale.WarehouseID,
		WarehouseFacturationID: whFactID,
		SaleID:                 sale.ID,
		EmployeeID:             &employeeID,
		Kind:                   types.InvoiceKindStandard,
		Number:                 invNumber,
		Status:                 types.InvoiceStatusIssued,
	}

	createdInv, err := s.saleRepo.CreateInvoice(ctx, tx, invEntity)
	if err != nil {
		return nil, fmt.Errorf("error al registrar factura: %w", err)
	}

	_ = s.saleRepo.UpdateStage(ctx, tx, saleID, types.StageInvoicing, types.SaleOpen)
	_ = s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageInvoicing, employeeID, "invoice")

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.FindInvoiceByID(ctx, createdInv.ID)
}

func (s *SaleService) FindInvoiceByID(ctx context.Context, invoiceID int64) (*dtos.InvoiceResponse, error) {
	inv, err := s.saleRepo.FindInvoiceByID(ctx, s.pool, invoiceID)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("factura no encontrada")
	}

	return &dtos.InvoiceResponse{
		ID:                     inv.ID,
		CompanyID:              inv.CompanyID,
		WarehouseID:            inv.WarehouseID,
		WarehouseName:          inv.WarehouseName,
		WarehouseFacturationID: inv.WarehouseFacturationID,
		SaleID:                 inv.SaleID,
		SaleSerial:             inv.SaleSerial,
		ReturnID:               inv.ReturnID,
		EmployeeID:             inv.EmployeeID,
		EmployeeName:           inv.EmployeeName,
		Kind:                   inv.Kind,
		Number:                 inv.Number,
		Status:                 inv.Status,
		PDFURL:                 inv.PDFURL,
		IssuedAt:               inv.IssuedAt,
		CreatedAt:              inv.CreatedAt,
	}, nil
}

func (s *SaleService) ListInvoices(ctx context.Context, f dtos.InvoiceFilterQuery) ([]dtos.InvoiceResponse, int, error) {
	list, total, err := s.saleRepo.ListInvoices(ctx, s.pool, f)
	if err != nil {
		return nil, 0, err
	}

	res := make([]dtos.InvoiceResponse, 0, len(list))
	for _, inv := range list {
		res = append(res, dtos.InvoiceResponse{
			ID:                     inv.ID,
			CompanyID:              inv.CompanyID,
			WarehouseID:            inv.WarehouseID,
			WarehouseName:          inv.WarehouseName,
			WarehouseFacturationID: inv.WarehouseFacturationID,
			SaleID:                 inv.SaleID,
			SaleSerial:             inv.SaleSerial,
			ReturnID:               inv.ReturnID,
			EmployeeID:             inv.EmployeeID,
			EmployeeName:           inv.EmployeeName,
			Kind:                   inv.Kind,
			Number:                 inv.Number,
			Status:                 inv.Status,
			PDFURL:                 inv.PDFURL,
			IssuedAt:               inv.IssuedAt,
			CreatedAt:              inv.CreatedAt,
		})
	}
	return res, total, nil
}

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
		const updateCarrierSql = `UPDATE sales SET carrier_id = COALESCE($1, carrier_id), tracking_no = COALESCE($2, tracking_no) WHERE id = $3`
		_, _ = tx.Exec(ctx, updateCarrierSql, req.CarrierID, req.TrackingNo, saleID)
	}

	if err := s.saleRepo.UpdateStage(ctx, tx, saleID, types.StageDispatch, types.SaleOpen); err != nil {
		return err
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageDispatch, employeeID, "dispatch"); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

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
