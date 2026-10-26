// TransfersScreen · control de traslados entre bodegas con existencias visibles y novedades
// conecta con: transfers.service, CreateTransferModal, ReceiveTransferModal y usePermissions
import React, { useState, useEffect, useCallback } from 'react'
import './TransfersScreen.css'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/toast'
import { useAppSelector } from '@/global/hooks/useRedux'
import { usePermissions } from '@/global/hooks/usePermissions'
import { fetchWarehouseTransfers, updateTransferStatus } from '../services/transfers.service'
import { CreateTransferModal } from '../components/CreateTransferModal'
import { ReceiveTransferModal } from '../components/ReceiveTransferModal'
import { TransferItemsTable } from '../components/TransferItemsTable'
import type { TrasladeItem } from '../types/transfers.types'

export const TransfersScreen: React.FC = () => {
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('inventory', 'transfers', 'create')

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [receivingTransfer, setReceivingTransfer] = useState<TrasladeItem | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; items: TrasladeItem[]; error: string | null } | null>(null)

  const warehouses = useAppSelector((state) => state.warehouses.items)
  const activeWarehouseNum = activeWarehouseId ? Number(activeWarehouseId) : 0
  const otherWarehouses = warehouses.map((warehouse) => String(warehouse.id)).filter((id) => Number(id) !== activeWarehouseNum).join(',')
  const loadKey = `${activeWarehouseNum}:${reloadTick}`

  const loadData = useCallback(() => setReloadTick((tick) => tick + 1), [])

  // ojo: no se manda userId: la lista es la de la bodega activa (con userId el backend solo trae los traslados de ese usuario y los entrantes de otros no aparecerían)
  // "cargando" se deduce de que la última respuesta no es de esta bodega y recarga; así no hay setState síncrono dentro del efecto
  useEffect(() => {
    if (!activeWarehouseNum) return
    let current = true
    fetchWarehouseTransfers(activeWarehouseNum, otherWarehouses.split(',').filter(Boolean).map(Number))
      .then((data) => current && setLoaded({ key: loadKey, items: data, error: null }))
      .catch((error) => current && setLoaded({ key: loadKey, items: [], error: getErrorMessage(error, 'No se pudieron cargar los traslados.') }))
    return () => {
      current = false
    }
  }, [activeWarehouseNum, otherWarehouses, loadKey])

  const loading = activeWarehouseNum !== 0 && loaded?.key !== loadKey
  const items = loaded?.items ?? []
  const loadError = loaded?.key === loadKey ? loaded.error : null

  const filteredItems = items.filter((item) =>
    activeTab === 'incoming'
      ? item.destWarehouse.id === activeWarehouseNum
      : item.originWarehouse.id === activeWarehouseNum
  )

  const handleAdvanceStatus = async (item: TrasladeItem) => {
    const nextStatus = item.invoiceStatus === 'verification' ? 'picking' : 'dispatch'
    try {
      await updateTransferStatus(item.saleId, nextStatus)
      toast.success('Estado del traslado actualizado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el estado del traslado.'))
    } finally {
      loadData() // se vuelve a leer siempre: muestra el estado real, haya salido bien o mal
    }
  }

  return (
    <div className="transfers-container">
      <div className="transfers-toolbar">
        <div className="transfers-tabs">
          <button
            type="button"
            className={`transfers-tab-btn ${activeTab === 'incoming' ? 'transfers-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            📥 Traslados Entrantes (Hacia esta sede)
          </button>
          <button
            type="button"
            className={`transfers-tab-btn ${activeTab === 'outgoing' ? 'transfers-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('outgoing')}
          >
            📤 Traslados Salientes (Despachos)
          </button>
        </div>

        {canCreate && (
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            + Nuevo Traslado Multibodega
          </button>
        )}
      </div>

      <div className="transfers-table-card">
        {loading ? (
          <div className="transfers-empty">Cargando traslados entre bodegas...</div>
        ) : loadError ? (
          <div className="transfers-empty">
            {loadError}{' '}
            <button type="button" className="transfers-tab-btn" onClick={loadData}>
              Reintentar
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="transfers-empty">
            No hay traslados {activeTab === 'incoming' ? 'entrantes' : 'salientes'} registrados para esta bodega.
          </div>
        ) : (
          <TransferItemsTable
            items={filteredItems}
            activeTab={activeTab}
            onAdvanceStatus={handleAdvanceStatus}
            onReceive={setReceivingTransfer}
          />
        )}
      </div>

      <CreateTransferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false)
          loadData()
        }}
      />

      <ReceiveTransferModal
        isOpen={Boolean(receivingTransfer)}
        transfer={receivingTransfer}
        onClose={() => setReceivingTransfer(null)}
        onSuccess={() => {
          setReceivingTransfer(null)
          loadData()
        }}
      />
    </div>
  )
}

export default TransfersScreen
