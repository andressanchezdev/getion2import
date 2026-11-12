package services

// purchase_excel_service · Excel de compras: exportar, cargar el catálogo del proveedor y listar sus productos
// conecta con: PurchaseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en purchase_service.go)

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/purchases/dtos"

	"github.com/jackc/pgx/v5"
	"github.com/xuri/excelize/v2"
)

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

	// la importación guarda fila por fila (una fila mala no tumba las demás); al final se avisa una vez lo que quedó vinculado
	if updated > 0 {
		importWarnings := warnings
		if importWarnings == nil {
			importWarnings = []string{}
		}
		if err := db.WithTx(ctx, s.pool, func(ctx context.Context, _ pgx.Tx) error {
			s.events.Record(ctx, events.NewSupplierCatalogImported(supplier.CompanyID, events.SupplierCatalogImportedData{
				SupplierID: supplier.ID,
				Linked:     updated,
				Warnings:   importWarnings,
			}))
			return nil
		}); err != nil {
			return nil, utils.Internal("Error al avisar la importación del catálogo.", err)
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
