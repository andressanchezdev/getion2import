// TransfersScreen · Tienda > Traslados: pestañas «Repuestos en sede» y «Traslados» con barra de búsqueda y filtros al mismo nivel integrado
// conecta con: useTransfersLoader (los pide), transfers.selectors y transfers.thunks (despachar), transfers.filters (filtros), TransferItemsTable, WarehouseProductsTable y navigation (openDrawerForm)
import React, { useMemo, useState } from 'react'
import './TransfersScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { toast } from '@/global/helpers/feedback/toast'
import { TransferItemsTable } from '../components/table/TransferItemsTable'
import { WarehouseProductsTable } from '../components/table/WarehouseProductsTable'
import { INITIAL_TRANSFER_FILTERS, TRANSFER_DIRECTION_OPTIONS, TRANSFER_STATUS_OPTIONS, TRANSFER_TYPE_OPTIONS } from '../constants/transfers.constants'
import { filterTransfers, hasTransferFilters } from '../helpers/transfers.filters'
import { useTransfersLoader } from '../hooks/useTransfersLoader'
import { selectTransfersList } from '../selectors/transfers.selectors'
import { dispatchTransferThunk } from '../thunks/transfers.thunks'
import type { TransferFilters, TrasladeItem } from '../types/transfers.types'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

type TransfersTab = 'products' | 'transfers'

export const TransfersScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
  const canCreate = usePermissions().can('transfers:create')
  const [activeTab, setActiveTab] = useState<TransfersTab>('products')
  const [filters, setFilters] = useState<TransferFilters>(INITIAL_TRANSFER_FILTERS)
  const [productQuery, setProductQuery] = useState('')

  const warehouseId = activeWarehouseId ? Number(activeWarehouseId) : 0
  const { items, status, error } = useAppSelector(selectTransfersList)
  useTransfersLoader(warehouseId, activeTab === 'transfers')

  const filteredItems = useMemo(() => filterTransfers(items, filters, warehouseId), [items, filters, warehouseId])
  const setFilter = <K extends keyof TransferFilters>(key: K, value: TransferFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const handleDispatch = async (item: TrasladeItem) => {
    try {
      await dispatch(dispatchTransferThunk(item.id)).unwrap()
      toast.success(`Traslado ${item.serialCode} marcado como en tránsito.`)
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo despachar el traslado.')
    }
  }

  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando traslados…'
    if (filteredItems.length === 0) return 'No hay traslados que coincidan con los filtros seleccionados.'
    return null
  })()

  return (
    <div className="transfers-container">
      <div className="data-card">
        <div className="data-toolbar transfers-toolbar">
          <div className="transfers-toolbar-left">
            <SearchBar
              value={activeTab === 'transfers' ? filters.query : productQuery}
              onChange={(value) =>
                activeTab === 'transfers' ? setFilter('query', value) : setProductQuery(value)
              }
              hasActiveFilters={activeTab === 'transfers' ? hasTransferFilters(filters) : Boolean(productQuery)}
              onClear={() => (activeTab === 'transfers' ? setFilters(INITIAL_TRANSFER_FILTERS) : setProductQuery(''))}
              placeholder={
                activeTab === 'transfers'
                  ? 'Buscar por serial, repuesto, responsable o bodega…'
                  : 'Buscar repuesto, código o estante en esta bodega…'
              }
              className="transfers-search-bar"
            />
            <div className="transfers-tabs">
              <button
                type="button"
                className={`transfers-tab-btn ${activeTab === 'products' ? 'transfers-tab-btn-active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                Repuestos en sede
              </button>
              <button
                type="button"
                className={`transfers-tab-btn ${activeTab === 'transfers' ? 'transfers-tab-btn-active' : ''}`}
                onClick={() => setActiveTab('transfers')}
              >
                Traslados ({items.length})
              </button>
            </div>
          </div>

          <div className="transfers-toolbar-right">
            {activeTab === 'transfers' && (
              <>
                <FilterSelect
                  label="Tipo de traslado"
                  emptyValue="all"
                  value={filters.type}
                  options={TRANSFER_TYPE_OPTIONS}
                  onChange={(value) => setFilter('type', value || 'all')}
                />
                <FilterSelect
                  label="Ruta / Dirección"
                  emptyValue="all"
                  value={filters.direction}
                  options={TRANSFER_DIRECTION_OPTIONS}
                  onChange={(value) => setFilter('direction', (value || 'all') as TransferFilters['direction'])}
                />
                <FilterSelect
                  label="Estado"
                  emptyValue="all"
                  value={filters.status}
                  options={TRANSFER_STATUS_OPTIONS}
                  onChange={(value) => setFilter('status', value || 'all')}
                />
              </>
            )}

            {canCreate && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => dispatch(openDrawerForm({ kind: 'createTransfer' }))}
              >
                <Icon svg={plusIcon} /> Nuevo traslado
              </button>
            )}
          </div>
        </div>

        {activeTab === 'products' ? (
          <WarehouseProductsTable
            warehouseId={warehouseId}
            warehouseName={activeWarehouseName}
            externalQuery={productQuery}
            hideToolbar
          />
        ) : message ? (
          <div className="transfers-empty">{message}</div>
        ) : (
          <TransferItemsTable
            items={filteredItems}
            currentWarehouseId={warehouseId}
            onDispatch={handleDispatch}
            onReceive={(item) => dispatch(openDrawerForm({ kind: 'receiveTransfer', payload: item }))}
            onViewDetail={(item) => dispatch(openDrawerForm({ kind: 'transferDetail', payload: item }))}
          />
        )}
      </div>
    </div>
  )
}

export default TransfersScreen
