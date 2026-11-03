// InventoryCountsScreen.tsx · pantalla de Conteos Físicos y Auditoría de Inventario
import React, { useState } from 'react'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useInventoryCounts } from '../hooks/useInventoryCounts'
import { InventoryCountsTable } from '../components/counts/InventoryCountsTable'
import { CountDetailModal } from '../components/counts/CountDetailModal'
import { CreateCountModal } from '../components/counts/CreateCountModal'
import type { CountStatus } from '../types/inventory.counts.types'

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
    closeDetail,
    handleCreateCount,
    handleUpdateItems,
    handleVerify,
    handleCorroborate,
    activeWarehouseId,
  } = useInventoryCounts()

  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('inventory', 'products', 'create')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <div className="inventory-screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="inventory-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
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
              + Nuevo Conteo Físico
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

      {selectedCount && (
        <CountDetailModal
          count={selectedCount}
          onClose={closeDetail}
          onSaveItems={handleUpdateItems}
          onVerify={handleVerify}
          onCorroborate={handleCorroborate}
        />
      )}

      {createModalOpen && activeWarehouseId && (
        <CreateCountModal
          warehouseId={Number(activeWarehouseId)}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateCount}
        />
      )}
    </div>
  )
}

export default InventoryCountsScreen

