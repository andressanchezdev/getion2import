// useInventoryCounts.ts · hook para la gestión del flujo de conteos físicos de inventario
// conecta con: inventory.counts.service, useAppSelector (bodega activa)
import { useState, useCallback, useEffect } from 'react'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import type { PaginatorMetadata } from '@/api'
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

export const useInventoryCounts = () => {
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
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
      await loadCounts()
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
      await openDetail(countId)
      await loadCounts()
    } catch {
      toast.error('No se pudieron registrar las cantidades.')
      throw new Error('Error al actualizar cantidades')
    }
  }

  const handleVerify = async (countId: number) => {
    try {
      await apiVerifyCount(countId)
      toast.success('Conteo físico verificado.')
      await openDetail(countId)
      await loadCounts()
    } catch {
      toast.error('No se pudo verificar el conteo.')
    }
  }

  const handleCorroborate = async (countId: number) => {
    try {
      await apiCorroborateCount(countId)
      toast.success('Conteo corroborado. El inventario ha sido ajustado automáticamente.')
      await openDetail(countId)
      await loadCounts()
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
