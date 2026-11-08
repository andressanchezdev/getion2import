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
	authRepos "importadoraApi/src/features/auth/repositories"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SaleService struct {
	pool          *pgxpool.Pool
	saleRepo      *repositories.SaleRepository
	inventoryRepo *inventoryrepos.InventoryRepository
	auditRepo     *authRepos.AuditRepository
}

// NewSaleService crea el servicio con las piezas que necesita para funcionar.
func NewSaleService(pool *pgxpool.Pool, saleRepo *repositories.SaleRepository, inventoryRepo *inventoryrepos.InventoryRepository, auditRepo *authRepos.AuditRepository) *SaleService {
	return &SaleService{
		pool:          pool,
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
		auditRepo:     auditRepo,
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

	if err := validateCreateSale(req); err != nil {
		return nil, err
	}

	// Regla estricta: para ventas en efectivo se exige turno de caja abierto en la bodega
	if req.PaymentMethod == types.PaymentCash {
		var hasOpenSession bool
		err := s.pool.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM cash_sessions 
				WHERE company_id = $1 AND warehouse_id = $2 AND status = 'open'
			)
		`, companyID, req.WarehouseID).Scan(&hasOpenSession)
		if err != nil {
			return nil, utils.Internal("Error al validar turno de caja de la bodega.", err)
		}
		if !hasOpenSession {
			return nil, utils.Conflict("CASH_SESSION_CLOSED", "No se pueden realizar ventas en efectivo sin un turno de caja abierto en esta sede. Abre el turno de caja antes de continuar.")
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// ojo: si otra transacción tiene bloqueado el stock o la serie, se espera poco y se avisa en vez de dejar la petición colgada
	if _, err := tx.Exec(ctx, "SET LOCAL lock_timeout = '8s'"); err != nil {
		return nil, err
	}

	isCredit := req.PaymentCondition != nil && *req.PaymentCondition == types.ConditionCredit

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
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, utils.NotFound("STOCK_NOT_FOUND", fmt.Sprintf("La ubicación de stock %d no existe en la bodega %d. Vacía el carrito y vuelve a agregar los productos desde la bodega activa.", itemReq.StockID, req.WarehouseID))
			}
			return nil, utils.NormalizeDBError(err, "No se pudo bloquear el stock del producto.")
		}
		stID, prodID := locked.ID, locked.ProductID
		avail, res := locked.Available, locked.Reserved
		pCode, pName := locked.ProductCode, locked.ProductName
		costPrice, ivaRate, pricesRaw := locked.CostPrice, locked.IVARate, locked.PricesRaw

		sellable := avail - res
		if sellable < itemReq.Quantity {
			return nil, utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Stock insuficiente de '%s' (%s): disponible para venta %d y pediste %d.", pName, pCode, sellable, itemReq.Quantity))
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
			return nil, utils.Unprocessable("CREDIT_DISABLED", "El cliente no tiene habilitada la línea de crédito.")
		}
		if grandTotal > creditInfo.AvailableCredit {
			return nil, utils.Unprocessable("CREDIT_LIMIT_EXCEEDED", fmt.Sprintf("El total del pedido ($%.2f) excede el crédito disponible del cliente ($%.2f).", grandTotal, creditInfo.AvailableCredit))
		}
	}

	whID := req.WarehouseID
	serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &whID, types.SeriesSale, "PED-")
	if err != nil {
		return nil, fmt.Errorf("error al generar consecutivo de venta: %w", err)
	}

	// Todo pedido nace estrictamente en verificación (los inmediatos solo llevan el indicador de prioridad)
	initialStage := types.StageVerification

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
			return nil, utils.NotFound("SALESPERSON_NOT_FOUND", "El vendedor elegido no existe o no está activo en la compañía.")
		}
		effectiveEmployeeID = *req.SalespersonEmployeeID
	}
	if effectiveEmployeeID <= 0 {
		return nil, utils.BadRequest("SALESPERSON_REQUIRED", "Elige el vendedor al que se asigna el pedido: tu cuenta no está ligada a un empleado.")
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
		ImmediatePicking: req.ImmediatePicking != nil && *req.ImmediatePicking,
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
		// El pedido a crédito nace en verification: debe ser verificado por caja/cartera antes de alistarse
	}

	if req.PaymentMethod == types.PaymentTransfer && req.CustomerID != nil {
		// ojo: el pago nace en revisión con la serie de pagos; si falla, todo el pedido se deshace (antes el error se ignoraba y dejaba la transacción abortada)
		paymentSerial, err := utils.NextSerialCode(ctx, tx, companyID, &whID, types.SeriesPayment, "PAG-")
		if err != nil {
			return nil, utils.NormalizeDBError(err, "No se pudo generar el consecutivo del pago.")
		}
		if err := s.saleRepo.InsertTransferPayment(ctx, tx, companyID, paymentSerial, createdSale.ID, *req.CustomerID, effectiveEmployeeID, grandTotal, req.ProofURL, req.PaymentReference, req.Notes); err != nil {
			return nil, utils.NormalizeDBError(err, "No se pudo registrar el pago por transferencia.")
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

	return s.FindByID(ctx, createdSale.CompanyID, createdSale.ID)
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
