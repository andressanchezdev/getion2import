// TransfersScreen · control de traslados entre bodegas con existencias visibles y novedades
// conecta con: transfers.service, CreateTransferModal, ReceiveTransferModal y usePermissions
import React, { useState, useEffect, useCallback } from 'react'
import './TransfersScreen.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { usePermissions } from '@/global/hooks/usePermissions'
import { fetchTraslades, updateTransferStatus } from '../services/transfers.service'
import { CreateTransferModal } from '../components/CreateTransferModal'
import { ReceiveTransferModal } from '../components/ReceiveTransferModal'
import { TransferItemsTable } from '../components/TransferItemsTable'
import type { TrasladeItem } from '../types/transfers.types'

export const TransfersScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('inventory', 'transfers', 'create')

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [items, setItems] = useState<TrasladeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [receivingTransfer, setReceivingTransfer] = useState<TrasladeItem | null>(null)

  const activeWarehouseNum = activeWarehouseId ? Number(activeWarehouseId) : 0

  const loadData = useCallback(() => {
    if (!activeWarehouseNum) return
    setLoading(true)
    fetchTraslades(activeWarehouseNum, user?.userId)
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [activeWarehouseNum, user?.userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredItems = items.filter((item) =>
    activeTab === 'incoming'
      ? item.destWarehouse.id === activeWarehouseNum
      : item.originWarehouse.id === activeWarehouseNum
  )

  const handleAdvanceStatus = async (item: TrasladeItem) => {
    const nextStatus = item.invoiceStatus === 'pendiente' ? 'picking_verified' : 'packing_verified'
    await updateTransferStatus(item.saleId, nextStatus)
    loadData()
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
