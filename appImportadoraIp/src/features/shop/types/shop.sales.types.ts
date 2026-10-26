// shop.sales.types · cierre de la venta: medios de pago y lo que se envía y devuelve POST /sales/register
// conecta con: shop.sales.service (los usa), shop.checkout.thunks y ShopCartFooter (medio de pago elegido)
// ojo: la API real solo confirma el medio 'cash' (venta 91486); 'transfer' y 'credit' son los valores que ya usaba la app. El Swagger no documenta el cuerpo de la respuesta (201 vacío)

export type PaymentMethod = 'cash' | 'transfer' | 'credit'

export interface RegisterSaleInput {
  uuid: string // uuid del carrito: el backend arma la venta con sus líneas
  customerId?: number // cliente de la venta; sin cliente la venta queda a nombre del usuario de la sesión
  warehouseId: number
  paymentMethod: PaymentMethod
  totalAmount: number
}

// models.GetCartCreateSale (solo los campos que envía la app)
export interface RegisterSaleBody {
  companyId: number
  userId: number
  sellerId: number
  warehouseId: number
  uuid: string
  saleType: 'sale'
  paymentMethod: PaymentMethod
  totalAmount: number
}

// lo que se sabe de la venta creada; los dos datos son opcionales porque el Swagger no documenta la respuesta
export interface RegisteredSale {
  saleId?: number
  serialCode?: number
}

export interface CancelSaleInput {
  saleId: number
  reason: string
}
