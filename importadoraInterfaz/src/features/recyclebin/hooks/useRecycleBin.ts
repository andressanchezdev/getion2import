// useRecycleBin.ts · hook de estado para gestionar elementos en la papelera y restaurarlos
import { useState, useCallback, useEffect } from 'react'
import type { PaginatorMetadata } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import type { RecycleBinItem } from '../types/recyclebin.types'
import { fetchRecycleBin, restoreRecycleBinItem } from '../services/recyclebin.service'

export const useRecycleBin = () => {
  const [items, setItems] = useState<RecycleBinItem[]>([])
  const [meta, setMeta] = useState<PaginatorMetadata | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'restored' | 'all'>('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isRestoredParam =
        statusFilter === 'all' ? undefined : statusFilter === 'restored'
      const res = await fetchRecycleBin({
        table: tableFilter || undefined,
        isRestored: isRestoredParam,
        search: search.trim() || undefined,
        page,
        pageSize: 15,
      })
      setItems(res.data ?? [])
      setMeta(res.meta ?? null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar papelera de reciclaje.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [tableFilter, statusFilter, search, page])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleRestore = async (item: RecycleBinItem) => {
    setRestoringId(item.id)
    try {
      await restoreRecycleBinItem(item.id)
      toast.success(`"${item.entityLabel || item.entityTable}" restaurado exitosamente.`)
      await loadItems()
    } catch {
      toast.error('No se pudo restaurar el registro.')
    } finally {
      setRestoringId(null)
    }
  }

  return {
    items,
    meta,
    page,
    setPage,
    search,
    setSearch,
    tableFilter,
    setTableFilter,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    restoringId,
    loadItems,
    handleRestore,
  }
}

