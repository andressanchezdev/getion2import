// purchases.service · llamadas al backend de compras: lista, detalle, crear, recibir, anular y el Excel de la orden
// conecta con: api/client y api/config (PURCHASES), purchases.adapter (convierte), externals (proveedores) y global saveBlob; las usa purchases.thunks
// ojo: el Excel llega como archivo (no JSON): se pide como blob y se guarda con el nombre que manda el backend
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import { getExternals } from '@/features/externals'
import { filenameFromDisposition, saveBlob } from '@/global/helpers/files/saveBlob'
import { PURCHASES_LOAD_SIZE } from '../constants/purchases.constants'
import { toPurchase, toSupplierProduct } from '../helpers/purchases.adapter'
import type { CreatePurchaseInput, PayPurchaseInput, Purchase, PurchaseDto, ReceiveLineInput, SupplierOption, SupplierProduct, SupplierProductDto } from '../types/purchases.types'

const { PURCHASES } = API_CONFIG.ENDPOINTS

// las órdenes generales o de una bodega (sin renglones; el detalle los trae)
export const fetchPurchases = async (warehouseId?: number): Promise<Purchase[]> => {
  const params: Record<string, number> = { page: 1, pageSize: PURCHASES_LOAD_SIZE }
  if (warehouseId && warehouseId > 0) {
    params.warehouseId = warehouseId
  }
  const { data } = await apiClient.get<APIResponse<PurchaseDto[] | null>>(PURCHASES.LIST, { params })
  return toPaginated(data).items.map(toPurchase)
}

export const fetchPurchase = async (id: number): Promise<Purchase> => {
  const { data } = await apiClient.get<APIResponse<PurchaseDto>>(PURCHASES.BY_ID(id))
  return toPurchase(data.data!)
}

export const createPurchase = async (input: CreatePurchaseInput): Promise<Purchase> => {
  const { data } = await apiClient.post<APIResponse<PurchaseDto>>(PURCHASES.LIST, input)
  return toPurchase(data.data!)
}

// ingresa mercancía a la bodega en la ubicación elegida de cada renglón; devuelve la orden con su nuevo estado
export const receivePurchase = async (id: number, lines: ReceiveLineInput[]): Promise<Purchase> => {
  const { data } = await apiClient.post<APIResponse<PurchaseDto>>(PURCHASES.RECEIVE(id), { items: lines.filter((line) => line.quantity > 0) })
  return toPurchase(data.data!)
}

// anula la orden con su motivo (de 10 a 100 caracteres); la API lo deja en la auditoría
export const voidPurchase = async (id: number, reason: string): Promise<void> => {
  await apiClient.post(PURCHASES.VOID(id), { reason })
}

// baja el Excel de la orden y lo guarda en el equipo; devuelve el nombre del archivo
export const downloadPurchaseExcel = async (id: number, fallbackName: string): Promise<string> => {
  const response = await apiClient.get<Blob>(PURCHASES.EXPORT_EXCEL(id), { responseType: 'blob' })
  const filename = filenameFromDisposition(response.headers['content-disposition'] as string | undefined, `${fallbackName}.xlsx`)
  saveBlob(response.data, filename)
  return filename
}

// los proveedores activos para elegir al crear una orden
export const fetchSuppliers = async (): Promise<SupplierOption[]> => (await getExternals('supplier')).filter((supplier) => supplier.isActive).map((supplier) => ({ id: supplier.id, name: supplier.name }))

// la caja de la bodega paga (en efectivo) la recepción de una orden; devuelve la orden con lo pagado
export const payPurchase = async (id: number, input: PayPurchaseInput): Promise<Purchase> => {
  const { data } = await apiClient.post<APIResponse<PurchaseDto>>(PURCHASES.PAY(id), input)
  return toPurchase(data.data!)
}

// los productos que vende un proveedor (su catálogo)
export const fetchSupplierProducts = async (supplierId: number): Promise<SupplierProduct[]> => {
  const { data } = await apiClient.get<APIResponse<SupplierProductDto[] | null>>(PURCHASES.SUPPLIER_PRODUCTS(supplierId))
  return (data.data ?? []).map(toSupplierProduct)
}

// agrega un producto al catálogo del proveedor o cambia su costo y código; devuelve el catálogo completo
export const saveSupplierProduct = async (supplierId: number, input: { productId: number; cost: number; supplierCode: string }): Promise<SupplierProduct[]> => {
  const { data } = await apiClient.put<APIResponse<SupplierProductDto[] | null>>(PURCHASES.SUPPLIER_PRODUCTS(supplierId), input)
  return (data.data ?? []).map(toSupplierProduct)
}

export const deleteSupplierProduct = async (supplierId: number, productId: number): Promise<void> => {
  await apiClient.delete(PURCHASES.SUPPLIER_PRODUCT(supplierId, productId))
}
