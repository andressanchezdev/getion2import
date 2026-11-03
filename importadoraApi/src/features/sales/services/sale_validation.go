package services

// sale_validation.go · revisa la petición de crear un pedido antes de tocar la base: método de pago, condición, cliente, cantidades y descuentos
// conecta con: sale_service.Create; devuelve errores 400 con código para que el frontend muestre el motivo exacto
// ojo: los tags validate:"required" de los DTOs no se ejecutan en esta API, por eso estas reglas se escriben aquí

import (
	"fmt"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
)

// validateCreateSale devuelve el primer problema de la petición, o nil si se puede intentar crear el pedido
func validateCreateSale(req dtos.CreateSaleRequest) error {
	if req.WarehouseID <= 0 {
		return utils.BadRequest("WAREHOUSE_REQUIRED", "Elige la bodega del pedido.")
	}
	if len(req.Items) == 0 {
		return utils.BadRequest("NO_ITEMS", "El pedido debe tener al menos un producto.")
	}
	switch req.PaymentMethod {
	case types.PaymentCash, types.PaymentTransfer, types.PaymentCredit:
	default:
		return utils.BadRequest("INVALID_PAYMENT_METHOD", "El método de pago debe ser efectivo, transferencia o crédito.")
	}
	if req.PaymentCondition != nil && *req.PaymentCondition != types.ConditionCash && *req.PaymentCondition != types.ConditionCredit {
		return utils.BadRequest("INVALID_PAYMENT_CONDITION", "La condición de pago debe ser contado o crédito.")
	}
	needsCustomer := req.PaymentMethod != types.PaymentCash || (req.PaymentCondition != nil && *req.PaymentCondition == types.ConditionCredit)
	if needsCustomer && (req.CustomerID == nil || *req.CustomerID <= 0) {
		return utils.BadRequest("CUSTOMER_REQUIRED", "Elige el cliente: las ventas por transferencia o a crédito lo necesitan.")
	}
	if req.PriceTier != nil {
		switch *req.PriceTier {
		case types.PriceTierP1, types.PriceTierP2, types.PriceTierP3, types.PriceTierP4:
		default:
			return utils.BadRequest("INVALID_PRICE_TIER", "El nivel de precio debe ser p1, p2, p3 o p4.")
		}
	}
	for i, item := range req.Items {
		line := i + 1
		if item.StockID <= 0 {
			return utils.BadRequest("ITEM_WITHOUT_STOCK", fmt.Sprintf("El producto %d no tiene una ubicación de bodega asignada; vuelve a agregarlo al carrito.", line))
		}
		if item.Quantity <= 0 {
			return utils.BadRequest("INVALID_QUANTITY", fmt.Sprintf("La cantidad del producto %d debe ser mayor a 0.", line))
		}
		if item.UnitPrice != nil && *item.UnitPrice < 0 {
			return utils.BadRequest("INVALID_PRICE", fmt.Sprintf("El precio del producto %d no puede ser negativo.", line))
		}
		if item.Discount != nil && (*item.Discount < 0 || *item.Discount > 100) {
			return utils.BadRequest("INVALID_DISCOUNT", fmt.Sprintf("El descuento del producto %d debe estar entre 0 y 100 %%.", line))
		}
		if item.IVAPercent != nil && (*item.IVAPercent < 0 || *item.IVAPercent > 100) {
			return utils.BadRequest("INVALID_IVA", fmt.Sprintf("El IVA del producto %d debe estar entre 0 y 100 %%.", line))
		}
	}
	return nil
}
