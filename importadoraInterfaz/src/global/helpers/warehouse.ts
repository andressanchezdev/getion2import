// warehouse · convierte el id de bodega que guarda la app (texto) al número que espera el backend
// conecta con: shop.helpers (lo re-exporta), shop.*.thunks y wallet.thunks (las bodegas viajan como número en las peticiones)

// id de bodega (texto) → número; undefined si todavía no hay bodega elegida o el id no es válido
export const toWarehouseNumber = (id: string): number | undefined => {
  const value = Number(id)
  return id !== '' && Number.isInteger(value) && value > 0 ? value : undefined
}
