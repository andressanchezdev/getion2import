// OrdersToolbar · barra de la tabla de pedidos: búsqueda (38%), filtros centrales (bodega, etapa, canal) y acciones
// conecta con: orders.slice (filtros), orders.selectors, global SearchBar
// ojo: sigue estrictamente la misma estructura y línea de diseño canónica
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { selectWarehouses } from '@/features/warehouses'
import { ORDER_CHANNELS } from '../../constants/orders.constants'
import { selectOrderStageChips, selectVisibleOrders } from '../../selectors/orders.selectors'
import { setOrderChannel, setOrderQuery, setOrderStage, setOrderWarehouse } from '../../slices/orders.slice'
import { loadOrderCountsThunk, loadOrdersThunk } from '../../thunks/orders.thunks'
import type { OrderChannelFilter, OrderStageKey } from '../../types/orders.types'
import './OrdersToolbar.css'

export interface OrdersToolbarProps {
  hideWarehouseFilter?: boolean
  extraActions?: React.ReactNode
}

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({ hideWarehouseFilter = false, extraActions }) => {
  const dispatch = useAppDispatch()
  const { stage, channel, query, selectedWarehouseId } = useAppSelector((state) => state.orders)
  const chips = useAppSelector(selectOrderStageChips)
  const warehouses = useAppSelector(selectWarehouses)
  const visible = useAppSelector(selectVisibleOrders)

  const handleWarehouseChange = (val: string) => {
    const nextId = !val || val === 'all' ? null : Number(val)
    dispatch(setOrderWarehouse(nextId))
    dispatch(loadOrdersThunk())
    dispatch(loadOrderCountsThunk())
  }

  const hasCombinedFilters = Boolean(
    query.trim() ||
    (channel && channel !== 'all') ||
    (!hideWarehouseFilter && selectedWarehouseId !== null)
  )

  const handleClearCombined = () => {
    dispatch(setOrderQuery(''))
    dispatch(setOrderChannel('all'))
    if (!hideWarehouseFilter) {
      dispatch(setOrderWarehouse(null))
    }
    dispatch(loadOrdersThunk())
    dispatch(loadOrderCountsThunk())
  }

  return (
    <div className="data-toolbar orders-toolbar">
      <SearchBar
        value={query}
        onChange={(value) => dispatch(setOrderQuery(value))}
        hasActiveFilters={hasCombinedFilters}
        onClear={handleClearCombined}
        placeholder="Buscar por pedido, cliente, vendedor o método de pago…"
        className="orders-toolbar-search"
      />

      <div className="orders-toolbar-middle">
        {!hideWarehouseFilter && (
          <FilterSelect
            label="Bodega"
            allLabel="Todas las bodegas"
            emptyValue="all"
            value={selectedWarehouseId ? String(selectedWarehouseId) : 'all'}
            options={warehouses.map((wh) => ({ value: String(wh.id), label: wh.name }))}
            onChange={handleWarehouseChange}
          />
        )}

        <FilterSelect
          label="Etapa"
          value={stage}
          options={chips.map((chip) => ({ value: chip.key, label: `${chip.label} (${chip.count ?? '–'})` }))}
          onChange={(val) => {
            if (val) dispatch(setOrderStage(val as OrderStageKey))
          }}
        />

        <FilterSelect
          label="Canal"
          allLabel="Todos los canales"
          emptyValue="all"
          value={channel}
          options={ORDER_CHANNELS.map((ch) => ({ value: ch.key, label: ch.label }))}
          onChange={(val) => dispatch(setOrderChannel(val as OrderChannelFilter))}
        />
      </div>

      <div className="orders-toolbar-actions">
        <span className="orders-toolbar-count">
          {visible.length} {visible.length === 1 ? 'pedido' : 'pedidos'}
        </span>
        {extraActions}
      </div>
    </div>
  )
}

export default OrdersToolbar
