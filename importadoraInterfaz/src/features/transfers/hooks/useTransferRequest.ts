// useTransferRequest · estado del pedido de traslado: bodega que recibe, líneas de varias bodegas de origen, búsqueda de repuestos y envío
// conecta con: CreateTransferForm (lo usa), useTransferProductSearch (buscar), transfers.request (reglas), createTransferRequestThunk (enviar) y warehouses y auth
// ojo: cada línea es un repuesto de UNA bodega; al enviar, la API crea un traslado por cada bodega de origen
import { useState } from 'react'
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
  product?: { id: string | number; code: string; name: string }
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

  // Bodega destino: fija para empleados; elegible para administradores/superadmins
  const destWarehouseId = isEmployee
    ? employeeWhId
    : draft.destWarehouseId || initial?.destinationWarehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0)

  const destWarehouse = warehouses.find((w) => Number(w.id) === destWarehouseId)
  const destWarehouseName = destWarehouse ? destWarehouse.name : destWarehouseId > 0 ? `Bodega #${destWarehouseId}` : ''

  const [search, setSearch] = useState(initial?.product?.code || initial?.product?.name || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TransferRequestResult[] | null>(null)
  const { items: products, status: searchStatus } = useTransferProductSearch(search)

  const lines = draft.lines

  // agrega 1 unidad del repuesto desde esa bodega (si ya estaba, suma una más)
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

  const changeQuantity = (line: TransferRequestLine, quantity: number) => {
    dispatch(updateTransferDraftQuantity({ line, quantity }))
  }

  const remove = (line: TransferRequestLine) => {
    dispatch(removeTransferDraftLine(line))
  }

  const handleSetDestWarehouseId = (id: number) => {
    if (!isEmployee) {
      dispatch(setTransferDraftDest(id))
    }
  }

  // valida y envía el pedido; si alguna bodega falla se queda en pantalla con lo que falló
  const submit = async () => {
    const problem = validateRequest(lines, destWarehouseId)
    if (problem) return setError(problem)
    setSubmitting(true)
    setError(null)
    try {
      const outcome = await dispatch(createTransferRequestThunk({ destWarehouseId, lines })).unwrap()
      setResults(outcome)
      const created = outcome.filter((result) => result.transfer).length
      if (created > 0) {
        toast.success(created === 1 ? 'Traslado registrado exitosamente' : `${created} traslados registrados exitosamente`)
        dispatch(clearTransferDraft())
      }
      // lo que salió bien deja de estar en el pedido; lo que falló queda para reintentar
      const failedOrigins = new Set(outcome.filter((result) => result.error).map((result) => result.originWarehouseId))
      const failedLines = lines.filter((line) => failedOrigins.has(line.originWarehouseId))
      if (failedLines.length > 0) {
        dispatch(clearTransferDraft())
        failedLines.forEach((fl) => dispatch(addTransferDraftLine({ line: fl, destWarehouseId })))
      }
    } catch (message) {
      setError(typeof message === 'string' ? message : 'No se pudo registrar el pedido de traslado.')
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
    search,
    setSearch,
    products,
    searching: searchStatus === 'loading',
    lines,
    units: totalUnits(lines),
    addFrom,
    changeQuantity,
    remove,
    submitting,
    error,
    results,
    submit,
  }
}
