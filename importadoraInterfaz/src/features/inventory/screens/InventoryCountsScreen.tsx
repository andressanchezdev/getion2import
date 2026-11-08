// InventoryCountsScreen.tsx · pantalla de Conteos Físicos y Auditoría de Inventario
import React, { useEffect, useRef, useState } from 'react'
import { openDrawerForm } from '@/features/navigation'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useInventoryCounts } from '../hooks/useInventoryCounts'
import { InventoryCountsTable } from '../components/counts/InventoryCountsTable'
import type { CountStatus } from '../types/inventory.counts.types'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

export const InventoryCountsScreen: React.FC = () => {
  const {
    counts,
    meta,
    setPage,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    selectedCount,
    loadCounts,
    openDetail,
    handleCreateCount,
    handleUpdateItems,
    handleVerify,
    handleCorroborate,
    activeWarehouseId,
  } = useInventoryCounts()

  const dispatch = useAppDispatch()
  // el panel recibe siempre las acciones más recientes sin volver a abrirse por cada cambio del hook
  const actions = useRef({ handleUpdateItems, handleVerify, handleCorroborate })
  useEffect(() => {
    actions.current = { handleUpdateItems, handleVerify, handleCorroborate }
  })
  // el detalle del conteo se abre en el panel derecho; si el conteo cambia (verificar, corroborar) se vuelve a abrir con el dato nuevo
  useEffect(() => {
    if (!selectedCount) return
    dispatch(
      openDrawerForm({
        kind: 'countDetail',
        payload: {
          count: selectedCount,
          onSaveItems: (id: number, items: Parameters<typeof handleUpdateItems>[1]) => actions.current.handleUpdateItems(id, items),
          onVerify: (id: number) => actions.current.handleVerify(id),
          onCorroborate: (id: number) => actions.current.handleCorroborate(id),
        },
      })
    )
  }, [selectedCount, dispatch])

  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('inventory', 'products', 'create')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <div className="inventory-screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="inventory-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div className="data-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
              Filtrar por estado:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CountStatus | '')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--bg-main)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes de conteo</option>
              <option value="verified">Verificados (por corroborar)</option>
              <option value="corroborated">Corroborados (ajuste aplicado)</option>
            </select>
          </div>

          {canCreate && (
            <button
              type="button"
              className="btn-primary"
              disabled={!activeWarehouseId}
              title={!activeWarehouseId ? 'Selecciona una bodega activa para iniciar un conteo' : undefined}
              onClick={() => setCreateModalOpen(true)}
            >
              <Icon svg={plusIcon} /> Nuevo Conteo Físico
            </button>
          )}
        </div>

        <InventoryCountsTable
          items={counts}
          loading={loading}
          error={error}
          onOpenDetail={openDetail}
          onRetry={loadCounts}
        />
      </div>

      {meta && (
        <Pagination
          meta={meta}
          disabled={loading}
          label="Paginación de conteos físicos"
          onPageChange={setPage}
        />
      )}

      <ReasonPrompt
        open={createModalOpen && Boolean(activeWarehouseId)}
        title="Iniciar conteo físico"
        message="Se creará un registro de conteo físico para la bodega activa, congelando las existencias esperadas actuales."
        confirmLabel="Iniciar conteo"
        fieldLabel="Observaciones o notas (opcional)"
        placeholder="Ej: auditoría física de fin de mes, pasillos A y B..."
        minLength={0}
        maxLength={200}
        onConfirm={(notes) => {
          setCreateModalOpen(false)
          void handleCreateCount({ warehouseId: Number(activeWarehouseId), notes: notes || undefined })
        }}
        onCancel={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

export default InventoryCountsScreen

