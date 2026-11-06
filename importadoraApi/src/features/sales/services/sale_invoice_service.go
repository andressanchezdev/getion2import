package services

// sale_invoice_service · facturas de los pedidos: emitir y consultar
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/repositories"
)

// IssueInvoice emite la factura del pedido con la numeración de su bodega y lo pasa a la etapa de despacho.
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
		return nil, utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
	}
	if err := ensureOpen(sale, "facturar"); err != nil {
		return nil, err
	}
	if err := ensureStageFor(sale, "invoice"); err != nil {
		return nil, err
	}
	if existing, err := s.saleRepo.CountInvoices(ctx, tx, saleID); err != nil {
		return nil, utils.NormalizeDBError(err, "No se pudieron revisar las facturas del pedido.")
	} else if existing > 0 {
		return nil, utils.Conflict("ALREADY_INVOICED", "El pedido ya tiene factura emitida.")
	}

	warehouseFacturation, err := s.saleRepo.FindWarehouseFacturation(ctx, tx, sale.WarehouseID)
	if err != nil {
		return nil, utils.Internal("No se pudo consultar la configuración fiscal de la bodega.", err)
	}
	if warehouseFacturation == nil {
		return nil, utils.Unprocessable("WAREHOUSE_WITHOUT_BILLING", fmt.Sprintf("La bodega %d no tiene configuración fiscal; configúrala antes de facturar.", sale.WarehouseID))
	}
	whID := sale.WarehouseID
	invNumber, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &whID, types.SeriesInvoice, "FAC-")
	if err != nil {
		return nil, fmt.Errorf("error al obtener consecutivo de factura: %w", err)
	}
	nextNumber, err := s.saleRepo.FindInvoiceSeriesNextNumber(ctx, tx, sale.CompanyID, sale.WarehouseID)
	if err != nil {
		return nil, utils.Internal("No se pudo validar el rango autorizado de la factura.", err)
	}
	issuedNumber := nextNumber - 1

	invEntity := &repositories.InvoiceEntity{
		CompanyID:              sale.CompanyID,
		WarehouseID:            sale.WarehouseID,
		WarehouseFacturationID: warehouseFacturation.ID,
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

	if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageInvoicing, types.SaleOpen, &employeeID); err != nil {
		return nil, utils.NormalizeDBError(err, "No se pudo mover el pedido a facturación.")
	}

	// al facturar queda la fecha de venta; si la venta es a crédito, el cliente queda debiendo el total en el libro de crédito
	// (los abonos verificados lo van descontando; lo que ya pagó al inicio también cuenta como abono)
	firstTime, err := s.saleRepo.MarkSold(ctx, tx, saleID)
	if err != nil {
		return nil, fmt.Errorf("error al marcar la fecha de venta: %w", err)
	}
	if firstTime && sale.PaymentMethod == types.PaymentCredit && sale.CustomerID != nil {
		if err := s.saleRepo.InsertCreditCharge(ctx, tx, sale.CompanyID, *sale.CustomerID, employeeID, sale.Total, sale.ID, fmt.Sprintf("Venta a crédito %s facturada", sale.SerialCode)); err != nil {
			return nil, fmt.Errorf("error al asentar la deuda de la venta a crédito: %w", err)
		}
	}
	if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageInvoicing, employeeID, "invoice"); err != nil {
		return nil, utils.NormalizeDBError(err, "No se pudieron actualizar los renglones del pedido.")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	response, err := s.FindInvoiceByID(ctx, createdInv.ID)
	if err != nil {
		return nil, err
	}
	if warehouseFacturation.ResolutionNumber == nil || strings.TrimSpace(*warehouseFacturation.ResolutionNumber) == "" {
		response.Warnings = append(response.Warnings, "La factura se emitió sin una resolución DIAN configurada.")
	}
	if warehouseFacturation.ResolutionExpired {
		response.Warnings = append(response.Warnings, "La resolución DIAN está vencida; la factura se emitió y debe revisarse.")
	}
	if warehouseFacturation.RangeTo != nil && issuedNumber > *warehouseFacturation.RangeTo {
		response.Warnings = append(response.Warnings, "El consecutivo emitido excede el rango autorizado; la factura se emitió y debe revisarse.")
	}
	if warehouseFacturation.RangeFrom != nil && issuedNumber < *warehouseFacturation.RangeFrom {
		response.Warnings = append(response.Warnings, "El consecutivo emitido está por debajo del rango autorizado; la factura se emitió y debe revisarse.")
	}
	return response, nil
}

// FindInvoiceByID devuelve una factura por su id, validando que sea de la compañía del usuario.
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

// ListInvoices lista las facturas según los filtros, limitadas a la compañía del usuario.
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
