// shop.checkout.constants · medios de pago que se ofrecen al finalizar el pedido
// conecta con: ShopCartFooter (las opciones) y shop.sales.types (PaymentMethod)
// ojo: el backend solo confirmó 'cash'; los otros dos son los valores que ya usaba la app y hay que validarlos al probar con el backend real
import type { PaymentMethod } from '../types/shop.sales.types'

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito' },
]
