package services

// sale_invoice_service · facturas de los pedidos: emitir y consultar
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"
	"errors"
	"fmt"

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

	_ = s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageInvoicing, types.SaleOpen, &employeeID)

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
	_ = s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageInvoicing, employeeID, "invoice")

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.FindInvoiceByID(ctx, createdInv.ID)
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
