package services

// sale_query_service · consulta de pedidos: detalle y listado
// conecta con: SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go)

import (
	"context"

	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
)

// FindByID devuelve el pedido por su id, validando que sea de la compañía del usuario.
func (s *SaleService) FindByID(ctx context.Context, companyID, id int64) (*dtos.SaleResponse, error) {
	entity, err := s.saleRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, err
	}
	if entity == nil || (companyID > 0 && entity.CompanyID != companyID) {
		return nil, utils.NotFound("SALE_NOT_FOUND", "La venta no existe.")
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
			CreditAmount:          entity.CreditAmount,
		SaleAt:                entity.SaleAt,
		DueDate:               dueDateStr,
		ShippingAddress:       entity.ShippingAddress,
		CarrierID:             entity.CarrierID,
		CarrierName:           entity.CarrierName,
		TrackingNo:            entity.TrackingNo,
		CancelReason:          entity.CancelReason,
		CancelledByEmployeeID: entity.CancelledByEmployeeID,
		CancelledByName:       entity.CancelledByName,
		PaymentProofURL:       entity.PaymentProofURL,
		PaymentReference:      entity.PaymentReference,
		Notes:                 entity.Notes,
		CreatedAt:             entity.CreatedAt,
		UpdatedAt:             entity.UpdatedAt,
		Items:                 items,
		Invoices:              invResponses,
	}, nil
}

// List devuelve los pedidos paginados según los filtros, limitados a lo que el usuario puede ver.
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
			CreditAmount:          entity.CreditAmount,
			SaleAt:                entity.SaleAt,
			DueDate:               dueDateStr,
			ShippingAddress:       entity.ShippingAddress,
			CarrierID:             entity.CarrierID,
			CarrierName:           entity.CarrierName,
			TrackingNo:            entity.TrackingNo,
			CancelReason:          entity.CancelReason,
			CancelledByEmployeeID: entity.CancelledByEmployeeID,
			CancelledByName:       entity.CancelledByName,
			PaymentProofURL:       entity.PaymentProofURL,
			PaymentReference:      entity.PaymentReference,
			Notes:                 entity.Notes,
			CreatedAt:             entity.CreatedAt,
			UpdatedAt:             entity.UpdatedAt,
		})
	}
	return responses, total, nil
}
