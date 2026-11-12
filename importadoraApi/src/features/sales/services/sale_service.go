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
	"importadoraApi/src/core/events"
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
	events        *events.Recorder
}

// NewSaleService crea el servicio con las piezas que necesita para funcionar.
func NewSaleService(pool *pgxpool.Pool, saleRepo *repositories.SaleRepository, inventoryRepo *inventoryrepos.InventoryRepository, auditRepo *authRepos.AuditRepository, events *events.Recorder) *SaleService {
	return &SaleService{
		pool:          pool,
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
		auditRepo:     auditRepo,
		events:        events,
	}
}

// createdTransferPayment guarda lo mínimo del pago por transferencia creado con el pedido, para avisarlo al final de la transacción
type createdTransferPayment struct {
	id        int64
	serial    string
	amount    float64
	createdAt time.Time
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

	var createdSaleID, createdSaleCompanyID int64
	var transferPayment *createdTransferPayment
	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		// ojo: si otra transacción tiene bloqueado el stock o la serie, se espera poco y se avisa en vez de dejar la petición colgada
		if _, err := tx.Exec(ctx, "SET LOCAL lock_timeout = '8s'"); err != nil {
			return err
		}

		isCredit := req.PaymentCondition != nil && *req.PaymentCondition == types.ConditionCredit

		type itemComputed struct {
			stockID     int64
			productID   int64
			productCode string
			productName string
			priceTier   types.PriceTier
			quantity    int
			unitPrice   float64
			unitCost    float64
			discount    float64
			ivaPercent  *float64
			ivaAmount   float64
			subtotal    float64
			lineTotal   float64
		}

		computedItems := make([]itemComputed, 0, len(req.Items))
		var grandSubtotal, grandDiscount, grandIVA, grandTotal float64

		customerTier := types.PriceTierP1
		if req.PriceTier != nil {
			customerTier = *req.PriceTier
		}

		for _, itemReq := range req.Items {
			if itemReq.Quantity <= 0 {
				return errors.New("la cantidad debe ser mayor a 0")
			}

			locked, err := s.saleRepo.LockStockForSale(ctx, tx, itemReq.StockID, req.WarehouseID)
			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					return utils.NotFound("STOCK_NOT_FOUND", fmt.Sprintf("La ubicación de stock %d no existe en la bodega %d. Vacía el carrito y vuelve a agregar los productos desde la bodega activa.", itemReq.StockID, req.WarehouseID))
				}
				return utils.NormalizeDBError(err, "No se pudo bloquear el stock del producto.")
			}
			stID, prodID := locked.ID, locked.ProductID
			avail, res := locked.Available, locked.Reserved
			pCode, pName := locked.ProductCode, locked.ProductName
			costPrice, ivaRate, pricesRaw := locked.CostPrice, locked.IVARate, locked.PricesRaw

			sellable := avail - res
			if sellable < itemReq.Quantity {
				return utils.BadRequest("INSUFFICIENT_STOCK", fmt.Sprintf("Stock insuficiente de '%s' (%s): disponible para venta %d y pediste %d.", pName, pCode, sellable, itemReq.Quantity))
			}

			lineTier := customerTier
			if itemReq.PriceTier != nil && *itemReq.PriceTier != "" {
				lineTier = *itemReq.PriceTier
			}

			var pricesMap map[string]float64
			if len(pricesRaw) > 0 {
				_ = json.Unmarshal(pricesRaw, &pricesMap)
			}
			tierKey := string(lineTier)
			// ojo: el precio sale siempre del nivel de la línea (unitPrice del request se ignora) y sin respaldo a p1
			unitPrice, ok := pricesMap[tierKey]
			if !ok || unitPrice <= 0 {
				return utils.BadRequest("PRICE_NOT_FOUND", fmt.Sprintf("El producto '%s' (%s) no tiene precio configurado para la tarifa %s.", pName, pCode, lineTier))
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
				priceTier:   lineTier,
				quantity:    itemReq.Quantity,
				unitPrice:   unitPrice,
				unitCost:    costPrice,
				discount:    lineDiscount, // ojo: se guarda el MONTO en pesos (la BD, el front y line_total lo tratan así); el request trae el porcentaje
				ivaPercent:  &ivaPct,
				ivaAmount:   lineIVA,
				subtotal:    lineSubtotal,
				lineTotal:   lineTotal,
			})
		}

		if isCredit && req.CustomerID != nil {
			creditInfo, err := s.saleRepo.GetCustomerCreditInfo(ctx, tx, *req.CustomerID)
			if err != nil {
				return fmt.Errorf("error al verificar crédito del cliente: %w", err)
			}
			if creditInfo == nil || !creditInfo.CreditEnabled {
				return utils.Unprocessable("CREDIT_DISABLED", "El cliente no tiene habilitada la línea de crédito.")
			}
			if grandTotal > creditInfo.AvailableCredit {
				return utils.Unprocessable("CREDIT_LIMIT_EXCEEDED", fmt.Sprintf("El total del pedido ($%.2f) excede el crédito disponible del cliente ($%.2f).", grandTotal, creditInfo.AvailableCredit))
			}
		}

		whID := req.WarehouseID
		serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &whID, types.SeriesSale, "PED-")
		if err != nil {
			return fmt.Errorf("error al generar consecutivo de venta: %w", err)
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
			exists, err := s.saleRepo.ActiveEmployeeInWarehouseExists(ctx, tx, *req.SalespersonEmployeeID, companyID, req.WarehouseID)
			if err != nil {
				return fmt.Errorf("error al verificar empleado vendedor: %w", err)
			}
			if !exists {
				return utils.BadRequest("INVALID_SALESPERSON_WAREHOUSE", "El vendedor elegido no existe, no está activo o no pertenece a la bodega de la venta.")
			}
			effectiveEmployeeID = *req.SalespersonEmployeeID
		}
		if effectiveEmployeeID <= 0 {
			return utils.BadRequest("SALESPERSON_REQUIRED", "Elige el vendedor al que se asigna el pedido: tu cuenta no está ligada a un empleado.")
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
			return fmt.Errorf("error al guardar pedido de venta: %w", err)
		}
		createdSaleID = createdSale.ID
		createdSaleCompanyID = createdSale.CompanyID

		if req.QuotationID != nil && *req.QuotationID > 0 {
			// se lee el estado anterior para avisar el cambio a «convertida» con el pedido que la reemplaza
			var quotationFrom string
			var quotationCompany int64
			if err := tx.QueryRow(ctx, `SELECT status, company_id FROM quotations WHERE id = $1`, *req.QuotationID).Scan(&quotationFrom, &quotationCompany); err != nil {
				return fmt.Errorf("error al consultar la cotización: %w", err)
			}
			if err := s.saleRepo.MarkQuotationConverted(ctx, tx, *req.QuotationID, createdSale.ID); err != nil {
				return fmt.Errorf("error al actualizar estado de la cotización: %w", err)
			}
			s.events.Record(ctx, events.NewQuotationStatusChanged(quotationCompany, events.QuotationStatusChangedData{
				Entity: events.EntityRef{Kind: "quotation", ID: *req.QuotationID, Version: time.Now().UTC()},
				From:   quotationFrom,
				To:     "converted",
				SaleID: &createdSale.ID,
			}))
		}

		// el pedido entra al historial de etapas; un pedido a crédito deja todo su total a crédito (el cupo ya se validó arriba)
		creatorID := effectiveEmployeeID
		if err := s.saleRepo.RecordInitialStage(ctx, tx, createdSale.ID, initialStage, &creatorID); err != nil {
			return fmt.Errorf("error al registrar la etapa inicial del pedido: %w", err)
		}
		if isCredit || req.PaymentMethod == types.PaymentCredit {
			if err := s.saleRepo.SetCreditAmount(ctx, tx, createdSale.ID, grandTotal); err != nil {
				return fmt.Errorf("error al fijar la parte a crédito del pedido: %w", err)
			}
			// El pedido a crédito nace en verification: debe ser verificado por caja/cartera antes de alistarse
		}

		if req.PaymentMethod == types.PaymentTransfer && req.CustomerID != nil {
			// ojo: el pago nace en revisión con la serie de pagos; si falla, todo el pedido se deshace (antes el error se ignoraba y dejaba la transacción abortada)
			paymentSerial, err := utils.NextSerialCode(ctx, tx, companyID, &whID, types.SeriesPayment, "PAG-")
			if err != nil {
				return utils.NormalizeDBError(err, "No se pudo generar el consecutivo del pago.")
			}
			payID, payAt, err := s.saleRepo.InsertTransferPayment(ctx, tx, companyID, paymentSerial, createdSale.ID, *req.CustomerID, effectiveEmployeeID, grandTotal, req.ProofURL, req.PaymentReference, req.Notes)
			if err != nil {
				return utils.NormalizeDBError(err, "No se pudo registrar el pago por transferencia.")
			}
			transferPayment = &createdTransferPayment{id: payID, serial: paymentSerial, amount: grandTotal, createdAt: payAt}
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
				return fmt.Errorf("error al guardar ítem de venta: %w", err)
			}

			if err := s.inventoryRepo.ReserveStock(ctx, tx, it.stockID, it.quantity); err != nil {
				// otro pedido se llevó las unidades justo antes: se avisa con un 400 claro (no un 500) y el pedido completo se deshace
				if errors.Is(err, inventoryrepos.ErrInsufficientStock) {
					return insufficientStockError(ctx, tx, s.inventoryRepo, it.stockID, it.productCode, it.quantity)
				}
				return fmt.Errorf("error al reservar stock para producto %s: %w", it.productCode, err)
			}
			s.events.Stock(ctx, it.stockID, events.CauseReservation(createdSale.ID, createdSale.SerialCode))
		}

		// el evento lleva la misma forma que la fila del listado de pedidos (con vendedor, pago y crédito ya guardados)
		row, err := s.saleRepo.FindByID(ctx, tx, createdSale.ID)
		if err != nil {
			return err
		}
		if row == nil {
			return utils.Internal("No se pudo leer la venta recién creada.", nil)
		}
		s.events.Record(ctx, events.NewSaleCreated(row.CompanyID, row.WarehouseID, map[string]any{
			"id":               row.ID,
			"serial":           row.SerialCode,
			"serialCode":       row.SerialCode,
			"customerId":       row.CustomerID,
			"customerName":     row.CustomerName,
			"employeeId":       row.EmployeeID,
			"employeeName":     row.EmployeeName,
			"warehouseId":      row.WarehouseID,
			"paymentMethod":    string(row.PaymentMethod),
			"immediatePicking": row.ImmediatePicking,
			"currentStage":     string(row.CurrentStage),
			"status":           string(row.Status),
			"total":            row.Total,
			"paidTotal":        row.PaidTotal,
			"creditAmount":     row.CreditAmount,
			"createdAt":        row.CreatedAt.Format(time.RFC3339Nano),
			"updatedAt":        row.UpdatedAt.Format(time.RFC3339Nano),
		}))
		// el pago por transferencia que nace con el pedido también se avisa: así entra a «pagos por verificar» de quien concilia
		if transferPayment != nil {
			s.events.Record(ctx, events.NewPaymentCreated(row.CompanyID, map[string]any{
				"id":            transferPayment.id,
				"companyId":     row.CompanyID,
				"serialCode":    transferPayment.serial,
				"saleId":        row.ID,
				"saleSerial":    row.SerialCode,
				"customerId":    row.CustomerID,
				"customerName":  row.CustomerName,
				"employeeId":    row.EmployeeID,
				"employeeName":  row.EmployeeName,
				"method":        string(types.PaymentTransfer),
				"amount":        transferPayment.amount,
				"status":        string(types.PaymentStatusReview),
				"proofUrl":      req.ProofURL,
				"reference":     req.PaymentReference,
				"createdAt":     transferPayment.createdAt.Format(time.RFC3339Nano),
				"warehouseId":   row.WarehouseID,
				"warehouseName": row.WarehouseName,
			}))
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.FindByID(ctx, createdSaleCompanyID, createdSaleID)
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
