// useInventoryCounts.ts · hook para la gestión del flujo de conteos físicos de inventario
// conecta con: inventory.counts.service, useAppSelector (bodega activa)
import { useState, useCallback, useEffect } from 'react'
import { isRealtimeLive } from '@/features/realtime/helpers/realtime.guards'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import type { PaginatorMetadata } from '@/api'
import type { CountRealtimeEvent } from '../types/inventory.types'
import type {
  CountStatus,
  CreateCountInput,
  InventoryCount,
  UpdateCountItemInput,
} from '../types/inventory.counts.types'
import {
  corroborateCount as apiCorroborateCount,
  createCount as apiCreateCount,
  fetchCountById,
  fetchCounts,
  updateCountItems as apiUpdateCountItems,
  verifyCount as apiVerifyCount,
} from '../services/inventory.counts.service'

// aplica al detalle abierto las cantidades que alguien acaba de contar (por fila de stock)
export const applyCountProgress = (count: InventoryCount, countId: number, items: { stockId: number; countedQty: number | null }[], by: string): InventoryCount => {
  if (count.id !== countId || !count.items) return count
  const byStock = new Map(items.map((item) => [item.stockId, item.countedQty]))
  return {
    ...count,
    items: count.items.map((item) => {
      if (!byStock.has(item.stockId)) return item
      const countedQty = byStock.get(item.stockId) ?? null
      return { ...item, countedQty, difference: countedQty === null ? null : countedQty - item.expectedQty, employeeName: by }
    }),
  }
}

export const useInventoryCounts = () => {
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  // con el socket en vivo los cambios llegan por evento (count.*) y no hace falta volver a pedir la lista ni el detalle
  const live = useAppSelector(isRealtimeLive)
  const countEvent = useAppSelector((state) => (state as { inventory?: { countEvent?: CountRealtimeEvent | null } }).inventory?.countEvent ?? null)
  const [counts, setCounts] = useState<InventoryCount[]>([])
  const [meta, setMeta] = useState<PaginatorMetadata | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<CountStatus | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detalle abierto
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadCounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCounts({
        warehouseId: activeWarehouseId ? Number(activeWarehouseId) : undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 15,
      })
      setCounts(res.data ?? [])
      setMeta(res.meta ?? null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar conteos físicos.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [activeWarehouseId, statusFilter, page])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void loadCounts()
    })
    return () => {
      cancelled = true
    }
  }, [loadCounts])

  // tiempo real: aplica el último evento count.* a la lista y al detalle abierto, sin peticiones
  useEffect(() => {
    if (!countEvent) return
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (countEvent.kind === 'created') {
        const created = countEvent.count
        const sameWarehouse = !activeWarehouseId || Number(activeWarehouseId) === created.warehouseId
        if (sameWarehouse && page === 1 && (statusFilter === '' || statusFilter === 'pending')) {
          setCounts((prev) => (prev.some((count) => count.id === created.id) ? prev : [created, ...prev]))
        }
        return
      }
      if (countEvent.kind === 'progress') {
        setSelectedCount((prev) => (prev ? applyCountProgress(prev, countEvent.countId, countEvent.items, countEvent.by) : prev))
        return
      }
      const patch = (count: InventoryCount): InventoryCount =>
        count.id === countEvent.countId ? { ...count, status: countEvent.to, closedAt: countEvent.to === 'corroborated' ? countEvent.at : count.closedAt } : count
      setCounts((prev) => prev.map(patch))
      setSelectedCount((prev) => (prev ? patch(prev) : prev))
    })
    return () => {
      cancelled = true
    }
    // solo reacciona a un evento nuevo: los filtros se leen como estén en ese momento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countEvent])

  const openDetail = async (countId: number) => {
    setLoadingDetail(true)
    try {
      const detail = await fetchCountById(countId)
      setSelectedCount(detail)
    } catch {
      toast.error('No se pudo cargar el detalle del conteo.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeDetail = () => {
    setSelectedCount(null)
  }

  const handleCreateCount = async (input: CreateCountInput) => {
    try {
      const created = await apiCreateCount(input)
      toast.success(`Conteo #${created.id} iniciado con éxito.`)
      if (!live) await loadCounts()
      return created
    } catch {
      toast.error('No se pudo iniciar el conteo físico.')
      throw new Error('Error al iniciar conteo')
    }
  }

  const handleUpdateItems = async (countId: number, items: UpdateCountItemInput[]) => {
    try {
      await apiUpdateCountItems(countId, items)
      toast.success('Cantidades contadas registradas.')
      if (!live) {
        await openDetail(countId)
        await loadCounts()
      }
    } catch {
      toast.error('No se pudieron registrar las cantidades.')
      throw new Error('Error al actualizar cantidades')
    }
  }

  const handleVerify = async (countId: number) => {
    try {
      await apiVerifyCount(countId)
      toast.success('Conteo físico verificado.')
      if (!live) {
        await openDetail(countId)
        await loadCounts()
      }
    } catch {
      toast.error('No se pudo verificar el conteo.')
    }
  }

  const handleCorroborate = async (countId: number) => {
    try {
      await apiCorroborateCount(countId)
      toast.success('Conteo corroborado. El inventario ha sido ajustado automáticamente.')
      if (!live) {
        await openDetail(countId)
        await loadCounts()
      }
    } catch {
      toast.error('No se pudo corroborar el conteo.')
    }
  }

  return {
    counts,
    meta,
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    selectedCount,
    loadingDetail,
    loadCounts,
    openDetail,
    closeDetail,
    handleCreateCount,
    handleUpdateItems,
    handleVerify,
    handleCorroborate,
    activeWarehouseId,
  }
}
