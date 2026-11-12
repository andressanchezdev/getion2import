package services

// sale_invoice_service · facturas de los pedidos: emitir y consultar
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/repositories"

	"github.com/jackc/pgx/v5"
)

// IssueInvoice emite la factura del pedido con la numeración de su bodega y lo pasa a la etapa de despacho.
func (s *SaleService) IssueInvoice(ctx context.Context, companyID, saleID, employeeID int64) (*dtos.InvoiceResponse, error) {
	var createdInvID int64
	var warehouseFacturation *repositories.WarehouseFacturationResolution
	var issuedNumber int64

	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		sale, err := s.saleRepo.FindByID(ctx, tx, saleID)
		if err != nil {
			return err
		}
		if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
			return utils.NotFound("SALE_NOT_FOUND", "El pedido no existe.")
		}
		if err := ensureOpen(sale, "facturar"); err != nil {
			return err
		}
		if err := ensureStageFor(sale, "invoice"); err != nil {
			return err
		}
		if existing, err := s.saleRepo.CountInvoices(ctx, tx, saleID); err != nil {
			return utils.NormalizeDBError(err, "No se pudieron revisar las facturas del pedido.")
		} else if existing > 0 {
			return utils.Conflict("ALREADY_INVOICED", "El pedido ya tiene factura emitida.")
		}

		wf, err := s.saleRepo.FindWarehouseFacturation(ctx, tx, sale.WarehouseID)
		if err != nil {
			return utils.Internal("No se pudo consultar la configuración fiscal de la bodega.", err)
		}
		if wf == nil {
			return utils.Unprocessable("WAREHOUSE_WITHOUT_BILLING", fmt.Sprintf("La bodega %d no tiene configuración fiscal; configúrala antes de facturar.", sale.WarehouseID))
		}
		warehouseFacturation = wf

		whID := sale.WarehouseID
		// el prefijo de la resolución DIAN de la bodega manda; "FAC-" solo si no se configuró
		prefix := strings.TrimSpace(warehouseFacturation.InvoicePrefix)
		if prefix == "" {
			prefix = "FAC-"
		}
		invNumber, err := utils.NextSerialCode(ctx, tx, sale.CompanyID, &whID, types.SeriesInvoice, prefix)
		if err != nil {
			return fmt.Errorf("error al obtener consecutivo de factura: %w", err)
		}
		nextNumber, err := s.saleRepo.FindInvoiceSeriesNextNumber(ctx, tx, sale.CompanyID, sale.WarehouseID)
		if err != nil {
			return utils.Internal("No se pudo validar el rango autorizado de la factura.", err)
		}
		issuedNumber = nextNumber - 1

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
			return fmt.Errorf("error al registrar factura: %w", err)
		}
		createdInvID = createdInv.ID

		if err := s.saleRepo.UpdateStageBy(ctx, tx, saleID, types.StageInvoicing, types.SaleOpen, &employeeID); err != nil {
			return utils.NormalizeDBError(err, "No se pudo mover el pedido a facturación.")
		}

		// al facturar queda la fecha de venta; si la venta es a crédito, el cliente queda debiendo el total en el libro de crédito
		// (los abonos verificados lo van descontando; lo que ya pagó al inicio también cuenta como abono)
		firstTime, err := s.saleRepo.MarkSold(ctx, tx, saleID)
		if err != nil {
			return fmt.Errorf("error al marcar la fecha de venta: %w", err)
		}
		if firstTime && sale.PaymentMethod == types.PaymentCredit && sale.CustomerID != nil {
			if err := s.saleRepo.InsertCreditCharge(ctx, tx, sale.CompanyID, *sale.CustomerID, employeeID, sale.Total, sale.ID, fmt.Sprintf("Venta a crédito %s facturada", sale.SerialCode)); err != nil {
				return fmt.Errorf("error al asentar la deuda de la venta a crédito: %w", err)
			}
			chargeRef := "sale"
			s.events.CreditBalance(ctx, tx, sale.CompanyID, *sale.CustomerID, &events.CreditEntryRef{Type: "charge", Amount: sale.Total, ReferenceType: &chargeRef, ReferenceID: &sale.ID})
		}
		if err := s.saleRepo.AdvanceItemsStage(ctx, tx, saleID, types.StageInvoicing, employeeID, "invoice"); err != nil {
			return utils.NormalizeDBError(err, "No se pudieron actualizar los renglones del pedido.")
		}

		s.events.Record(ctx, events.NewInvoiceIssued(sale.CompanyID, sale.WarehouseID, events.InvoiceRow{
			ID:         createdInv.ID,
			SaleID:     sale.ID,
			Serial:     invNumber,
			DianNumber: warehouseFacturation.ResolutionNumber,
			Total:      sale.Total,
			Status:     string(types.InvoiceStatusIssued),
			Version:    createdInv.IssuedAt,
		}))

		s.events.Record(ctx, events.NewSaleStageChanged(sale.CompanyID, sale.WarehouseID, events.SaleStageChangedData{
			Entity:  events.EntityRef{Kind: "sale", ID: sale.ID, Version: time.Now().UTC()},
			Serial:  sale.SerialCode,
			From:    string(sale.CurrentStage),
			To:      string(types.StageInvoicing),
			Status:  string(types.SaleOpen),
			TakenBy: employeeActor(employeeID),
		}))

		return nil
	})
	if err != nil {
		return nil, err
	}

	response, err := s.FindInvoiceByID(ctx, companyID, createdInvID)
	if err != nil {
		return nil, err
	}
	if warehouseFacturation.ResolutionNumber == nil || strings.TrimSpace(*warehouseFacturation.ResolutionNumber) == "" {
		response.Warnings = append(response.Warnings, "La factura se emitió sin una resolución DIAN configurada.")
	}
	if !warehouseFacturation.IsActive {
		response.Warnings = append(response.Warnings, "La configuración fiscal de la bodega está inactiva; la factura se emitió y debe revisarse.")
	}
	if warehouseFacturation.ResolutionExpired {
		response.Warnings = append(response.Warnings, "La resolución DIAN está vencida; la factura se emitió y debe revisarse.")
	}
	if warehouseFacturation.RangeFrom == nil || warehouseFacturation.RangeTo == nil {
		response.Warnings = append(response.Warnings, "No hay un rango de numeración completo configurado; la factura se emitió y debe revisarse.")
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
func (s *SaleService) FindInvoiceByID(ctx context.Context, companyID, invoiceID int64) (*dtos.InvoiceResponse, error) {
	inv, err := s.saleRepo.FindInvoiceByID(ctx, s.pool, invoiceID)
	if err != nil {
		return nil, err
	}
	if inv == nil || (companyID > 0 && inv.CompanyID != companyID) {
		return nil, utils.NotFound("INVOICE_NOT_FOUND", "La factura no existe.")
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
