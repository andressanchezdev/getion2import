package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	externalrepos "importadoraApi/src/features/externals/repositories"
	inventoryrepos "importadoraApi/src/features/inventory/repositories"
	"importadoraApi/src/features/purchases/dtos"
	"importadoraApi/src/features/purchases/repositories"
	warehouserepos "importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xuri/excelize/v2"
)

type PurchaseService struct {
	pool          *pgxpool.Pool
	purchaseRepo  *repositories.PurchaseRepository
	externalRepo  *externalrepos.ExternalRepository
	warehouseRepo *warehouserepos.WarehouseRepository
	inventoryRepo *inventoryrepos.InventoryRepository
	auditRepo     *authRepos.AuditRepository
}

func NewPurchaseService(
	pool *pgxpool.Pool,
	purchaseRepo *repositories.PurchaseRepository,
	externalRepo *externalrepos.ExternalRepository,
	warehouseRepo *warehouserepos.WarehouseRepository,
	inventoryRepo *inventoryrepos.InventoryRepository,
	auditRepo *authRepos.AuditRepository,
) *PurchaseService {
	return &PurchaseService{
		pool:          pool,
		purchaseRepo:  purchaseRepo,
		externalRepo:  externalRepo,
		warehouseRepo: warehouseRepo,
		inventoryRepo: inventoryRepo,
		auditRepo:     auditRepo,
	}
}

func (s *PurchaseService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreatePurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if req.SupplierID <= 0 {
		return nil, utils.BadRequest("MISSING_SUPPLIER", "El proveedor es requerido.")
	}
	if req.WarehouseID <= 0 {
		return nil, utils.BadRequest("MISSING_WAREHOUSE", "La bodega de destino es requerida.")
	}
	if len(req.Items) == 0 {
		return nil, utils.BadRequest("EMPTY_ITEMS", "La orden de compra debe contener al menos un producto.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	} else if req.CompanyID != nil && *req.CompanyID > 0 {
		companyID = *req.CompanyID
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de compra.", err)
	}
	defer tx.Rollback(ctx)

	// Validar proveedor
	supplier, err := s.externalRepo.FindByID(ctx, tx, req.SupplierID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedor.", err)
	}
	if supplier == nil || supplier.CompanyID != companyID {
		return nil, utils.NotFound("SUPPLIER_NOT_FOUND", "El proveedor no existe o no pertenece a la compañía.")
	}

	// Validar bodega
	wh, err := s.warehouseRepo.FindByID(ctx, tx, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar bodega.", err)
	}
	if wh == nil || wh.CompanyID != companyID {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe o no pertenece a la compañía.")
	}

	serialCode, err := utils.NextSerialCode(ctx, tx, companyID, &req.WarehouseID, types.SeriesPurchase, "OC-")
	if err != nil {
		return nil, utils.Internal("Error al generar consecutivo de orden de compra.", err)
	}

	var expectedDate *time.Time
	if req.ExpectedDate != nil && *req.ExpectedDate != "" {
		if t, err := time.Parse("2006-01-02", *req.ExpectedDate); err == nil {
			expectedDate = &t
		}
	}

	var grandSubtotal, grandIVA, grandTotal float64
	type itemComputed struct {
		productID  int64
		quantity   int
		unitCost   float64
		ivaPercent *float64
		subtotal   float64
	}
	itemsComputed := make([]itemComputed, 0, len(req.Items))

	for _, it := range req.Items {
		if it.Quantity <= 0 {
			return nil, utils.BadRequest("INVALID_QUANTITY", "La cantidad debe ser mayor a 0.")
		}
		if it.UnitCost < 0 {
			return nil, utils.BadRequest("INVALID_COST", "El costo unitario no puede ser negativo.")
		}

		lineSubtotal := float64(it.Quantity) * it.UnitCost
		lineIVA := 0.0
		if it.IVAPercent != nil && *it.IVAPercent > 0 {
			lineIVA = lineSubtotal * (*it.IVAPercent / 100.0)
		}

		grandSubtotal += lineSubtotal
		grandIVA += lineIVA
		grandTotal += (lineSubtotal + lineIVA)

		itemsComputed = append(itemsComputed, itemComputed{
			productID:  it.ProductID,
			quantity:   it.Quantity,
			unitCost:   it.UnitCost,
			ivaPercent: it.IVAPercent,
			subtotal:   lineSubtotal,
		})
	}

	entity := &repositories.PurchaseEntity{
		CompanyID:    companyID,
		SerialCode:   serialCode,
		SupplierID:   req.SupplierID,
		WarehouseID:  req.WarehouseID,
		EmployeeID:   actor.ActorID,
		Status:       types.PurchaseOrdered, // Nace lista para enviar a proveedor
		SupplierRef:  req.SupplierRef,
		ExpectedDate: expectedDate,
		Subtotal:     grandSubtotal,
		IVATotal:     grandIVA,
		Total:        grandTotal,
		Notes:        req.Notes,
	}

	created, err := s.purchaseRepo.Create(ctx, tx, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar orden de compra.", err)
	}

	for _, it := range itemsComputed {
		itemEntity := &repositories.PurchaseItemEntity{
			PurchaseID:  created.ID,
			ProductID:   it.productID,
			Quantity:    it.quantity,
			ReceivedQty: 0,
			UnitCost:    it.unitCost,
			IVAPercent:  it.ivaPercent,
			Subtotal:    it.subtotal,
		}
		if err := s.purchaseRepo.CreateItem(ctx, tx, itemEntity); err != nil {
			return nil, utils.Internal("Error al guardar ítem de la orden de compra.", err)
		}
	}

	_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &created.ID,
		Action:    "PURCHASE_CREATED",
		Reason:    fmt.Sprintf("Orden de compra %s creada por $%.2f", serialCode, grandTotal),
		IPAddress: ip,
		UserAgent: ua,
	})

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar orden de compra.", err)
	}

	return s.FindByID(ctx, actor, created.ID)
}

func (s *PurchaseService) FindByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.purchaseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar orden de compra.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	items, err := s.purchaseRepo.ListItems(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems de la orden de compra.", err)
	}

	return s.mapToDTO(entity, items), nil
}

func (s *PurchaseService) List(ctx context.Context, actor *middlewares.ActorContext, f dtos.PurchaseFilterQuery) ([]dtos.PurchaseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		f.CompanyID = actor.CompanyID
	}

	list, total, err := s.purchaseRepo.List(ctx, s.pool, f)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar órdenes de compra.", err)
	}

	meta := utils.BuildMeta(f.Page, f.PageSize, total)
	resp := make([]dtos.PurchaseResponse, 0, len(list))
	for i := range list {
		resp = append(resp, *s.mapToDTO(&list[i], nil))
	}

	return resp, &meta, nil
}

// ExportExcel genera un archivo Excel nativo (.xlsx) listo para descargar y compartir por WhatsApp al proveedor.
func (s *PurchaseService) ExportExcel(ctx context.Context, actor *middlewares.ActorContext, id int64) ([]byte, string, error) {
	p, err := s.FindByID(ctx, actor, id)
	if err != nil {
		return nil, "", err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Orden de Compra"
	f.SetSheetName("Sheet1", sheet)

	// Estilos
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16, Color: "1E293B"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"2563EB"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	boldStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
	})
	currencyStyle, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: &[]string{"$#,##0.00"}[0],
	})

	// Encabezado
	f.SetCellValue(sheet, "A1", "SOLICITUD DE PEDIDO A PROVEEDOR")
	f.SetCellStyle(sheet, "A1", "A1", titleStyle)

	f.SetCellValue(sheet, "A3", "Orden N°:")
	f.SetCellValue(sheet, "B3", p.SerialCode)
	f.SetCellStyle(sheet, "A3", "A3", boldStyle)

	f.SetCellValue(sheet, "A4", "Proveedor:")
	f.SetCellValue(sheet, "B4", p.SupplierName)
	f.SetCellStyle(sheet, "A4", "A4", boldStyle)

	f.SetCellValue(sheet, "A5", "Fecha:")
	f.SetCellValue(sheet, "B5", p.CreatedAt.Format("02/01/2006 15:04"))
	f.SetCellStyle(sheet, "A5", "A5", boldStyle)

	f.SetCellValue(sheet, "A6", "Bodega de Destino:")
	f.SetCellValue(sheet, "B6", p.WarehouseName)
	f.SetCellStyle(sheet, "A6", "A6", boldStyle)

	if p.SupplierRef != nil && *p.SupplierRef != "" {
		f.SetCellValue(sheet, "A7", "Referencia Proveedor:")
		f.SetCellValue(sheet, "B7", *p.SupplierRef)
		f.SetCellStyle(sheet, "A7", "A7", boldStyle)
	}

	// Encabezados de tabla
	startRow := 9
	headers := []string{"N°", "Cód. Proveedor", "Cód. Interno/OEM", "Descripción del Repuesto", "Cant. Solicitada", "Costo Unit.", "Subtotal"}
	cols := []string{"A", "B", "C", "D", "E", "F", "G"}

	for i, h := range headers {
		cell := fmt.Sprintf("%s%d", cols[i], startRow)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Filas de productos
	currentRow := startRow + 1
	for idx, it := range p.Items {
		supplierCode := "-"
		if it.SupplierCode != nil && *it.SupplierCode != "" {
			supplierCode = *it.SupplierCode
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", currentRow), idx+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", currentRow), supplierCode)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", currentRow), it.ProductCode)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", currentRow), it.ProductName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", currentRow), it.Quantity)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", currentRow), it.UnitCost)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", currentRow), it.Subtotal)

		f.SetCellStyle(sheet, fmt.Sprintf("F%d", currentRow), fmt.Sprintf("F%d", currentRow), currencyStyle)
		f.SetCellStyle(sheet, fmt.Sprintf("G%d", currentRow), fmt.Sprintf("G%d", currentRow), currencyStyle)

		currentRow++
	}

	// Totales
	totalRow := currentRow + 1
	f.SetCellValue(sheet, fmt.Sprintf("F%d", totalRow), "TOTAL:")
	f.SetCellValue(sheet, fmt.Sprintf("G%d", totalRow), p.Total)
	f.SetCellStyle(sheet, fmt.Sprintf("F%d", totalRow), fmt.Sprintf("G%d", totalRow), boldStyle)
	f.SetCellStyle(sheet, fmt.Sprintf("G%d", totalRow), fmt.Sprintf("G%d", totalRow), currencyStyle)

	// Ancho de columnas automático
	f.SetColWidth(sheet, "A", "A", 6)
	f.SetColWidth(sheet, "B", "B", 18)
	f.SetColWidth(sheet, "C", "C", 20)
	f.SetColWidth(sheet, "D", "D", 40)
	f.SetColWidth(sheet, "E", "E", 16)
	f.SetColWidth(sheet, "F", "F", 16)
	f.SetColWidth(sheet, "G", "G", 18)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, "", utils.Internal("Error al generar archivo Excel de la orden de compra.", err)
	}

	filename := fmt.Sprintf("Orden_Compra_%s.xlsx", p.SerialCode)
	return buf.Bytes(), filename, nil
}

// UploadSupplierCatalogExcel procesa el Excel con catálogo del proveedor para sincronizar códigos y costos.
func (s *PurchaseService) UploadSupplierCatalogExcel(ctx context.Context, actor *middlewares.ActorContext, supplierID int64, file io.Reader, filename string) (*dtos.SupplierCatalogUploadResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	supplier, err := s.externalRepo.FindByID(ctx, s.pool, supplierID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedor.", err)
	}
	if supplier == nil {
		return nil, utils.NotFound("SUPPLIER_NOT_FOUND", "El proveedor no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != supplier.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este proveedor.")
		}
	}

	xl, err := excelize.OpenReader(file)
	if err != nil {
		return nil, utils.BadRequest("INVALID_EXCEL", fmt.Sprintf("No se pudo leer el archivo Excel: %v", err))
	}
	defer xl.Close()

	sheets := xl.GetSheetList()
	if len(sheets) == 0 {
		return nil, utils.BadRequest("EMPTY_EXCEL", "El archivo Excel no contiene hojas de cálculo.")
	}

	rows, err := xl.GetRows(sheets[0])
	if err != nil {
		return nil, utils.Internal("Error al extraer filas del Excel.", err)
	}

	if len(rows) < 2 {
		return nil, utils.BadRequest("EMPTY_EXCEL", "El archivo Excel debe tener encabezados y al menos una fila de productos.")
	}

	// Mapeo flexible de columnas por nombre
	colSupplierCode := -1
	colProductCode := -1
	colCost := -1

	for idx, col := range rows[0] {
		c := strings.ToLower(strings.TrimSpace(col))
		if strings.Contains(c, "proveedor") || strings.Contains(c, "supplier") || c == "cod_prov" {
			colSupplierCode = idx
		} else if strings.Contains(c, "codigo") || strings.Contains(c, "oem") || strings.Contains(c, "referencia") || strings.Contains(c, "repuesto") {
			colProductCode = idx
		} else if strings.Contains(c, "costo") || strings.Contains(c, "precio") || strings.Contains(c, "price") || strings.Contains(c, "valor") {
			colCost = idx
		}
	}

	// Por defecto si no detecta nombres específicos: Col 0: Cód Proveedor, Col 1: Cód Producto, Col 2: Costo
	if colProductCode == -1 {
		colProductCode = 0
	}
	if colCost == -1 && len(rows[0]) > 1 {
		colCost = len(rows[0]) - 1
	}

	matched := 0
	updated := 0
	warnings := make([]string, 0)

	for rowIdx := 1; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]
		if len(row) <= colProductCode {
			continue
		}

		pCode := strings.TrimSpace(row[colProductCode])
		if pCode == "" {
			continue
		}

		var costVal float64
		if colCost != -1 && len(row) > colCost {
			rawCost := strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(row[colCost]), "$", ""), ",", "")
			if c, err := strconv.ParseFloat(rawCost, 64); err == nil && c >= 0 {
				costVal = c
			}
		}

		supplierCodeVal := ""
		if colSupplierCode != -1 && len(row) > colSupplierCode {
			supplierCodeVal = strings.TrimSpace(row[colSupplierCode])
		}

		prodID, _, err := s.purchaseRepo.FindProductByCode(ctx, s.pool, supplier.CompanyID, pCode)
		if err != nil || prodID == 0 {
			warnings = append(warnings, fmt.Sprintf("Fila %d: No se encontró producto interno con código o referencia '%s'", rowIdx+1, pCode))
			continue
		}

		matched++
		if err := s.purchaseRepo.UpsertSupplierProduct(ctx, s.pool, prodID, supplier.ID, costVal, supplierCodeVal); err != nil {
			warnings = append(warnings, fmt.Sprintf("Fila %d: Error al vincular producto '%s': %v", rowIdx+1, pCode, err))
		} else {
			updated++
		}
	}

	return &dtos.SupplierCatalogUploadResponse{
		SupplierID:      supplier.ID,
		SupplierName:    supplier.Name,
		TotalRowsRead:   len(rows) - 1,
		ProductsMatched: matched,
		ProductsUpdated: updated,
		Warnings:        warnings,
	}, nil
}

// ListSupplierProducts lista el catálogo de repuestos suministrados por un proveedor.
func (s *PurchaseService) ListSupplierProducts(ctx context.Context, actor *middlewares.ActorContext, supplierID int64) ([]dtos.SupplierProductItemDTO, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	supplier, err := s.externalRepo.FindByID(ctx, s.pool, supplierID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedor.", err)
	}
	if supplier == nil {
		return nil, utils.NotFound("SUPPLIER_NOT_FOUND", "El proveedor no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != supplier.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este proveedor.")
		}
	}

	return s.purchaseRepo.ListSupplierProducts(ctx, s.pool, supplierID)
}

// Receive recibe físicamente los productos en bodega, actualiza inventario y genera asiento en Kardex (purchase_in).
func (s *PurchaseService) Receive(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, req dtos.ReceivePurchaseRequest, ip, ua string) (*dtos.PurchaseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if len(req.Items) == 0 {
		return nil, utils.BadRequest("EMPTY_ITEMS", "Debe especificar las cantidades a recibir.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar transacción de recepción.", err)
	}
	defer tx.Rollback(ctx)

	p, err := s.purchaseRepo.FindByID(ctx, tx, purchaseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar orden de compra.", err)
	}
	if p == nil {
		return nil, utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	if p.Status != types.PurchaseOrdered && p.Status != types.PurchasePartial {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("No se puede recibir una orden en estado '%s'.", p.Status))
	}

	items, err := s.purchaseRepo.ListItems(ctx, tx, purchaseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ítems de la orden de compra.", err)
	}

	itemsMap := make(map[int64]repositories.PurchaseItemEntity)
	for _, it := range items {
		itemsMap[it.ID] = it
	}

	refType := "purchase"
	empID := actor.ActorID
	for _, reqIt := range req.Items {
		item, exists := itemsMap[reqIt.PurchaseItemID]
		if !exists {
			return nil, utils.BadRequest("ITEM_NOT_FOUND", fmt.Sprintf("El ítem %d no pertenece a la orden de compra.", reqIt.PurchaseItemID))
		}
		if reqIt.Quantity <= 0 {
			return nil, utils.BadRequest("INVALID_QUANTITY", "La cantidad a recibir debe ser mayor a 0.")
		}
		if (item.ReceivedQty + reqIt.Quantity) > item.Quantity {
			return nil, utils.BadRequest("EXCEEDS_QUANTITY", fmt.Sprintf("La cantidad a recibir (%d) excede el pendiente (%d) para '%s'.", reqIt.Quantity, item.Quantity-item.ReceivedQty, item.ProductName))
		}

		// 1. Actualizar cantidad recibida en el ítem
		if err := s.purchaseRepo.UpdateItemReceived(ctx, tx, item.ID, reqIt.Quantity); err != nil {
			return nil, utils.Internal("Error al actualizar cantidad recibida.", err)
		}

		// 2. Ingresar stock a la bodega
		stockEntity, err := s.inventoryRepo.UpsertStockDelta(ctx, tx, p.CompanyID, item.ProductID, p.WarehouseID, "", reqIt.Quantity, 0)
		if err != nil {
			return nil, utils.Internal("Error al ingresar stock recibido a la bodega.", err)
		}

		// 3. Actualizar costo de última compra en producto
		const updateCostSQL = `UPDATE products SET last_cost = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
		if _, err := tx.Exec(ctx, updateCostSQL, item.UnitCost, item.ProductID); err != nil {
			return nil, utils.Internal("Error al actualizar costo del producto.", err)
		}

		// 4. Asentar Kardex purchase_in
		reason := fmt.Sprintf("Recepción en muelle de orden de compra %s", p.SerialCode)
		movement := &inventoryrepos.AuditMovementEntity{
			CompanyID:     p.CompanyID,
			StockID:       stockEntity.ID,
			WarehouseID:   p.WarehouseID,
			ProductID:     item.ProductID,
			EmployeeID:    &empID,
			MovementType:  types.MovementPurchaseIn,
			Quantity:      reqIt.Quantity,
			ReferenceType: &refType,
			ReferenceID:   &p.ID,
			Reason:        &reason,
		}
		if _, err := s.inventoryRepo.RecordMovement(ctx, tx, movement); err != nil {
			return nil, utils.Internal("Error al registrar movimiento en Kardex.", err)
		}
	}

	// Reevaluar si se completó la totalidad de los ítems
	updatedItems, _ := s.purchaseRepo.ListItems(ctx, tx, purchaseID)
	allCompleted := true
	for _, it := range updatedItems {
		if it.ReceivedQty < it.Quantity {
			allCompleted = false
			break
		}
	}

	newStatus := types.PurchasePartial
	var receivedAt *time.Time
	if allCompleted {
		newStatus = types.PurchaseReceived
		now := time.Now()
		receivedAt = &now
	}

	if err := s.purchaseRepo.UpdateStatus(ctx, tx, purchaseID, newStatus, receivedAt); err != nil {
		return nil, utils.Internal("Error al actualizar estado de la orden de compra.", err)
	}

	_ = s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &p.ID,
		Action:    "PURCHASE_RECEIVED",
		Reason:    fmt.Sprintf("Recepción de mercancía registrada. Estado resultante: %s", newStatus),
		IPAddress: ip,
		UserAgent: ua,
	})

	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar recepción de compra.", err)
	}

	return s.FindByID(ctx, actor, purchaseID)
}

// Void anula una orden de compra siempre que no haya sido recibida.
func (s *PurchaseService) Void(ctx context.Context, actor *middlewares.ActorContext, purchaseID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	p, err := s.purchaseRepo.FindByID(ctx, s.pool, purchaseID)
	if err != nil {
		return utils.Internal("Error al consultar orden de compra.", err)
	}
	if p == nil {
		return utils.NotFound("PURCHASE_NOT_FOUND", "La orden de compra no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != p.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre esta orden de compra.")
		}
	}

	if p.Status == types.PurchaseReceived || p.Status == types.PurchasePartial {
		return utils.BadRequest("INVALID_STATUS", "No se puede anular una orden de compra que ya tiene recepciones de mercancía.")
	}

	if err := s.purchaseRepo.UpdateStatus(ctx, s.pool, purchaseID, types.PurchaseVoided, nil); err != nil {
		return utils.Internal("Error al anular orden de compra.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "purchases",
		EntityID:  &p.ID,
		Action:    "PURCHASE_VOIDED",
		Reason:    fmt.Sprintf("Orden de compra %s anulada", p.SerialCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

func (s *PurchaseService) mapToDTO(p *repositories.PurchaseEntity, items []repositories.PurchaseItemEntity) *dtos.PurchaseResponse {
	var expDateStr *string
	if p.ExpectedDate != nil {
		d := p.ExpectedDate.Format("2006-01-02")
		expDateStr = &d
	}

	itemsDTO := make([]dtos.PurchaseItemResponse, 0, len(items))
	for _, it := range items {
		itemsDTO = append(itemsDTO, dtos.PurchaseItemResponse{
			ID:           it.ID,
			PurchaseID:   it.PurchaseID,
			ProductID:    it.ProductID,
			ProductCode:  it.ProductCode,
			ProductName:  it.ProductName,
			SupplierCode: it.SupplierCode,
			Quantity:     it.Quantity,
			ReceivedQty:  it.ReceivedQty,
			UnitCost:     it.UnitCost,
			IVAPercent:   it.IVAPercent,
			Subtotal:     it.Subtotal,
		})
	}

	return &dtos.PurchaseResponse{
		ID:            p.ID,
		CompanyID:     p.CompanyID,
		SerialCode:    p.SerialCode,
		SupplierID:    p.SupplierID,
		SupplierName:  p.SupplierName,
		WarehouseID:   p.WarehouseID,
		WarehouseName: p.WarehouseName,
		EmployeeID:    p.EmployeeID,
		EmployeeName:  p.EmployeeName,
		Status:        p.Status,
		SupplierRef:   p.SupplierRef,
		ExpectedDate:  expDateStr,
		Subtotal:      p.Subtotal,
		IVATotal:      p.IVATotal,
		Total:         p.Total,
		Notes:         p.Notes,
		ReceivedAt:    p.ReceivedAt,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
		Items:         itemsDTO,
	}
}
