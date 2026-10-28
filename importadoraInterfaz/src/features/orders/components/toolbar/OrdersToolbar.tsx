// OrdersToolbar · barra de la tabla de pedidos: chips de etapa con su conteo, buscador y chip de canal
// conecta con: orders.slice (etapa, canal y búsqueda), orders.selectors (chips con conteo), global SearchBar, FilterChip y ChipSelect
// ojo: la etapa y el canal cambian lo que pide el backend; la búsqueda solo filtra lo ya cargado en la tabla
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { ChipSelect } from '@/global/components/UI/molecules/chips/ChipSelect'
import { FilterChip } from '@/global/components/UI/molecules/chips/FilterChip'
import { ORDER_CHANNELS } from '../../constants/orders.constants'
import { selectOrderStageChips } from '../../selectors/orders.selectors'
import { setOrderChannel, setOrderQuery, setOrderStage } from '../../slices/orders.slice'
import type { OrderChannelFilter } from '../../types/orders.types'
import './OrdersToolbar.css'

const CHANNEL_OPTIONS = ORDER_CHANNELS.map((channel) => ({ value: channel.key, label: channel.label }))

export const OrdersToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const { stage, channel, query } = useAppSelector((state) => state.orders)
  const chips = useAppSelector(selectOrderStageChips)

  return (
    <div className="orders-toolbar">
      {/* Etapas del pedido con cuántos hay en cada una */}
      <div className="orders-toolbar-stages" role="tablist" aria-label="Etapas del pedido">
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            role="tab"
            label={chip.label}
            count={chip.count ?? '–'}
            active={chip.key === stage}
            onClick={() => dispatch(setOrderStage(chip.key))}
          />
        ))}
      </div>

      <div className="orders-toolbar-tools">
        <SearchBar
          value={query}
          onChange={(value) => dispatch(setOrderQuery(value))}
          placeholder="Buscar por pedido, cliente, vendedor o método de pago…"
          className="orders-toolbar-search"
        />
        <ChipSelect
          label="Todos los canales"
          value={channel === 'all' ? null : channel}
          options={CHANNEL_OPTIONS}
          onChange={(value) => dispatch(setOrderChannel((value ?? 'all') as OrderChannelFilter))}
        />
      </div>
    </div>
  )
}

export default OrdersToolbar
