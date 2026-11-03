// checkout.types · modelos del flujo de finalizar compra: cliente, datos de entrega, forma de pago y de dónde salen los renglones
// conecta con: checkout.adapter (los arma), checkout.service, checkout.thunks y los pasos de CheckoutPanel
// ojo: un cliente es de la compañía, nunca de una bodega; la bodega de la venta es la activa del vendedor

// datos de entrega (se cargan del cliente y se pueden editar para esta venta)
export interface DeliveryData {
  address: string
  city: string
  phone: string
  notes: string
}

export interface CheckoutCustomer {
  id: number
  name: string
  document: string
  phone: string
  discountPercent: number // descuento general del cliente en todas sus compras (porcentaje)
  creditEnabled: boolean
  availableCredit: number // cupo que le queda (solo cuenta si tiene crédito habilitado)
  creditDays: number
  deliveries: DeliveryData[] // direcciones guardadas del cliente (puede no tener ninguna)
}

export type PaymentChoice = 'cash' | 'transfer' | 'credit'

// venta (carrito o cotización que continúa) o cotización (solo cliente)
export interface CheckoutPayload {
  mode: 'sale' | 'quotation'
  quotationId?: number // si viene, la venta sale de esa cotización en vez del carrito
  customerId?: number // si viene (ej. desde una cotización), el cliente queda seleccionado por defecto
}

// renglón listo para crear el pedido o la cotización (precio unitario con IVA incluido, como en el catálogo)
export interface CheckoutLine {
  productId: number
  stockId: number
  name: string
  quantity: number
  unitPrice: number
}
