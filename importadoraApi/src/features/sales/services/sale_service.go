package services

// sale_service.go · reglas de negocio de ventas: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de ventas; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"importadoraApi/src/core/db"
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

// NewSaleService crea el servicio con las piezas que necesita para funcionar.
func NewSaleService(pool *pgxpool.Pool, saleRepo *repositories.SaleRepository, inventoryRepo *inventoryrepos.InventoryRepository) *SaleService {
	return &SaleService{
		pool:          pool,
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
	}
}

// Create crea el pedido con las validaciones del negocio (compañía, duplicados y permisos).
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

		locked, err := s.saleRepo.LockStockForSale(ctx, tx, itemReq.StockID, req.WarehouseID)
		if err != nil {
			return nil, fmt.Errorf("stock ID %d no encontrado o no pertenece a la bodega %d: %w", itemReq.StockID, req.WarehouseID, err)
		}
		stID, prodID := locked.ID, locked.ProductID
		avail, res := locked.Available, locked.Reserved
		pCode, pName := locked.ProductCode, locked.ProductName
		costPrice, ivaRate, pricesRaw := locked.CostPrice, locked.IVARate, locked.PricesRaw

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
		exists, err := s.saleRepo.ActiveEmployeeExists(ctx, tx, *req.SalespersonEmployeeID, companyID)
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
		PaymentProofURL:  req.ProofURL,
		PaymentReference: req.PaymentReference,
		Notes:            req.Notes,
	}

	createdSale, err := s.saleRepo.Create(ctx, tx, saleEntity)
	if err != nil {
		return nil, fmt.Errorf("error al guardar pedido de venta: %w", err)
	}

	// el pedido entra al historial de etapas; un pedido a crédito deja todo su total a crédito (el cupo ya se validó arriba)
	creatorID := effectiveEmployeeID
	if err := s.saleRepo.RecordInitialStage(ctx, tx, createdSale.ID, initialStage, &creatorID); err != nil {
		return nil, fmt.Errorf("error al registrar la etapa inicial del pedido: %w", err)
	}
	if isCredit || req.PaymentMethod == types.PaymentCredit {
		if err := s.saleRepo.SetCreditAmount(ctx, tx, createdSale.ID, grandTotal); err != nil {
			return nil, fmt.Errorf("error al fijar la parte a crédito del pedido: %w", err)
		}
		// todo el pedido queda a crédito y el cupo ya se validó: el pago nace confirmado (listo para la cola de picking)
		if initialStage == types.StageVerification {
			if err := s.saleRepo.UpdateStageBy(ctx, tx, createdSale.ID, types.StageVerificationOK, types.SaleOpen, &creatorID); err != nil {
				return nil, fmt.Errorf("error al confirmar el pedido a crédito: %w", err)
			}
		}
	}

	if req.PaymentMethod == types.PaymentTransfer {
		paymentSerial := fmt.Sprintf("PAG-TRF-%s", createdSale.SerialCode)
		var custID int64
		if req.CustomerID != nil {
			custID = *req.CustomerID
		}
		if custID > 0 {
			_ = s.saleRepo.InsertTransferPayment(ctx, tx, companyID, paymentSerial, createdSale.ID, custID, effectiveEmployeeID, grandTotal, req.ProofURL, req.PaymentReference, req.Notes)
		}
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
			// otro pedido se llevó las unidades justo antes: se avisa con un 400 claro (no un 500) y el pedido completo se deshace
			if errors.Is(err, inventoryrepos.ErrInsufficientStock) {
				return nil, insufficientStockError(ctx, tx, s.inventoryRepo, it.stockID, it.productCode, it.quantity)
			}
			return nil, fmt.Errorf("error al reservar stock para producto %s: %w", it.productCode, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.FindByID(ctx, createdSale.ID)
}

// insufficientStockError arma el 400 INSUFFICIENT_STOCK con cuántas unidades quedan realmente vendibles (disponible - reservado) de esa existencia.
func insufficientStockError(ctx context.Context, q db.DBExecutor, inv *inventoryrepos.InventoryRepository, stockID int64, productCode string, requested int) error {
	sellable := 0
	if stock, err := inv.FindStockByID(ctx, q, stockID); err == nil && stock != nil {
		sellable = stock.Available - stock.Reserved
		if sellable < 0 {
			sellable = 0
		}
	}
	return utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf(
		"Stock insuficiente de %s: quedan %d disponibles y pediste %d. Otro pedido acaba de reservar unidades; ajusta la cantidad e inténtalo de nuevo.",
		productCode, sellable, requested))
}
