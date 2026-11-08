// useTransferRequest · estado del pedido de traslado: bodega que recibe, líneas de varias bodegas de origen, búsqueda de repuestos y envío
// conecta con: CreateTransferForm (lo usa), useTransferProductSearch (buscar), transfers.request (reglas), createTransferRequestThunk (enviar) y warehouses y auth
// ojo: cada línea es un repuesto de UNA bodega; al enviar, la API crea un traslado por cada bodega de origen
// ojo: el empleado solo pide hacia su sede (destino fijo); el administrador elige la bodega de origen y la de destino, en cualquier dirección
import { useState, useEffect } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { totalUnits, validateRequest } from '../helpers/transfers.request'
import {
  addTransferDraftLine,
  clearTransferDraft,
  removeTransferDraftLine,
  setTransferDraftDest,
  updateTransferDraftQuantity,
} from '../slices/transfers.slice'
import { createTransferRequestThunk } from '../thunks/transfers.thunks'
import type { ProductStockMatrix, TransferRequestLine, TransferRequestResult } from '../types/transfers.types'
import { useTransferProductSearch } from './useTransferProductSearch'

export interface CreateTransferInitialPayload {
  product?: {
    id: string | number
    code: string
    name: string
    stockByWarehouse?: Record<string, number>
    imageUrl?: string
  }
  originWarehouseId?: number
  destinationWarehouseId?: number
}

export const useTransferRequest = (initial?: CreateTransferInitialPayload) => {
  const dispatch = useAppDispatch()
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const currentUser = useAppSelector((state) => state.auth.user)
  const draft = useAppSelector((state) => state.transfers.draft)

  const isEmployee = currentUser?.userType?.toLowerCase() === 'employee'
  const employeeWhId = currentUser?.warehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0)

  // Bodega destino:
  // - Para EMPLEADOS: SIEMPRE es su bodega asignada (fija, no editable)
  // - Para ADMINS: seleccionable, por defecto la del borrador o la activa
  const destWarehouseId = isEmployee
    ? employeeWhId
    : draft.destWarehouseId || initial?.destinationWarehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0)

  const destWarehouse = warehouses.find((w) => Number(w.id) === destWarehouseId)
  const destWarehouseName = destWarehouse ? destWarehouse.name : destWarehouseId > 0 ? `Bodega #${destWarehouseId}` : 'Sin bodega asignada'

  // Producto activo pasado al abrir el drawer desde el catálogo
  const focusedProduct = initial?.product

  // Stock físico actual de este producto en la sede de destino
  const localStockInDest = focusedProduct?.stockByWarehouse
    ? Number(focusedProduct.stockByWarehouse[String(destWarehouseId)] ?? 0)
    : 0

  // Total consolidado en toda la red para el producto enfocado
  const totalRedStock = focusedProduct?.stockByWarehouse
    ? Object.values(focusedProduct.stockByWarehouse).reduce((acc, q) => acc + (Number(q) > 0 ? Number(q) : 0), 0)
    : 0

  const [search, setSearch] = useState('')
  const [isPriority, setIsPriority] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TransferRequestResult[] | null>(null)
  const { items: products, status: searchStatus } = useTransferProductSearch(search)

  const lines = draft.lines

  // administrador: de qué bodega salen los ítems (el empleado no la elige: pide a cualquier sede desde el desglose)
  const [adminOriginId, setAdminOriginId] = useState(() => initial?.originWarehouseId ?? draft.lines[0]?.originWarehouseId ?? 0)
  const originWarehouseId = isEmployee ? 0 : adminOriginId
  const setOriginWarehouseId = (id: number) => {
    if (isEmployee || id === adminOriginId) return
    // las líneas de otra bodega de origen ya no aplican: se vacía la solicitud al cambiarla
    if (lines.some((line) => line.originWarehouseId !== id)) {
      dispatch(clearTransferDraft())
      toast.info('Cambiaste la bodega de origen: se vació la solicitud.')
    }
    setAdminOriginId(id)
  }

  // Sincronizar destino en el estado global si es administrador
  useEffect(() => {
    if (!isEmployee && destWarehouseId > 0 && draft.destWarehouseId !== destWarehouseId) {
      dispatch(setTransferDraftDest(destWarehouseId))
    }
  }, [dispatch, isEmployee, destWarehouseId, draft.destWarehouseId])

  // Obtener cantidad solicitada para el producto enfocado desde una bodega de origen específica
  const getOriginQty = (originWarehouseId: number): number => {
    if (!focusedProduct) return 0
    const prodId = Number(focusedProduct.id)
    const line = lines.find((l) => l.productId === prodId && l.originWarehouseId === originWarehouseId)
    return line ? line.quantity : 0
  }

  // Establecer cantidad solicitada para el producto enfocado desde una bodega de origen específica
  const setOriginQty = (originWarehouseId: number, originWarehouseName: string, maxStock: number, quantity: number) => {
    if (!focusedProduct) return
    const prodId = Number(focusedProduct.id)
    const clamped = Math.max(0, Math.min(maxStock, quantity))

    const existing = lines.find((l) => l.productId === prodId && l.originWarehouseId === originWarehouseId)

    if (clamped <= 0) {
      if (existing) {
        dispatch(removeTransferDraftLine(existing))
      }
    } else {
      if (existing) {
        dispatch(updateTransferDraftQuantity({ line: existing, quantity: clamped }))
      } else {
        dispatch(
          addTransferDraftLine({
            destWarehouseId,
            line: {
              productId: prodId,
              code: focusedProduct.code,
              description: focusedProduct.name,
              originWarehouseId,
              originWarehouseName,
              quantity: clamped,
              max: maxStock,
            },
          })
        )
      }
    }
  }

  // Agrega desde el buscador manual alternativo
  const addFrom = (product: ProductStockMatrix, warehouseId: number) => {
    const location = product.locations.find((item) => item.warehouseId === warehouseId)
    if (!location || location.availableStock <= 0) return
    setError(null)
    dispatch(
      addTransferDraftLine({
        destWarehouseId,
        line: {
          productId: product.productId,
          code: product.code,
          description: product.description,
          originWarehouseId: warehouseId,
          originWarehouseName: location.warehouseName,
          quantity: 1,
          max: location.availableStock,
        },
      })
    )
  }

  const remove = (line: TransferRequestLine) => {
    dispatch(removeTransferDraftLine(line))
  }

  const clear = () => {
    dispatch(clearTransferDraft())
    toast.info('Borrador de solicitud de traslado vaciado.')
  }

  const handleSetDestWarehouseId = (id: number) => {
    if (!isEmployee) {
      dispatch(setTransferDraftDest(id))
    }
  }

  // valida y envía el pedido
  const submit = async () => {
    const problem = validateRequest(lines, destWarehouseId)
    if (problem) {
      setError(problem)
      toast.warning(problem)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const outcome = await dispatch(createTransferRequestThunk({ destWarehouseId, lines, isPriority })).unwrap()
      setResults(outcome)
      const created = outcome.filter((result) => result.transfer).length
      if (created > 0) {
        toast.success(
          created === 1
            ? `Solicitud de traslado hacia ${destWarehouseName} registrada con éxito`
            : `${created} solicitudes de traslado hacia ${destWarehouseName} registradas con éxito`
        )
        dispatch(clearTransferDraft())
      }
      const failedOrigins = new Set(outcome.filter((result) => result.error).map((result) => result.originWarehouseId))
      if (created > 0 && failedOrigins.size === 0) {
        dispatch(closeDrawerForm())
      }
      const failedLines = lines.filter((line) => failedOrigins.has(line.originWarehouseId))
      if (failedLines.length > 0) {
        dispatch(clearTransferDraft())
        failedLines.forEach((fl) => dispatch(addTransferDraftLine({ line: fl, destWarehouseId })))
      }
    } catch (message) {
      const msg = typeof message === 'string' ? message : 'No se pudo registrar la solicitud de traslado.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    warehouses,
    destWarehouseId,
    destWarehouseName,
    setDestWarehouseId: handleSetDestWarehouseId,
    isEmployee,
    originWarehouseId,
    setOriginWarehouseId,
    focusedProduct,
    localStockInDest,
    totalRedStock,
    search,
    setSearch,
    products,
    searching: searchStatus === 'loading',
    lines,
    units: totalUnits(lines),
    getOriginQty,
    setOriginQty,
    addFrom,
    remove,
    clear,
    isPriority,
    setIsPriority,
    submitting,
    error,
    results,
    submit,
  }
}
