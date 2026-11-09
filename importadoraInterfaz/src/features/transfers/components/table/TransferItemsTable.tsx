// TransferItemsTable · tabla de traslados con trazabilidad de empleados, tipo y novedades; mismo diseño que las tablas de cotizaciones y pedidos
// conecta con: TransfersScreen (la usa), transfers.constants (estado), RowActions (acciones con íconos de línea), audit (ver historial) y usePermissions
// ojo: los íconos son los de línea de assets/icons (?raw), que toman el color del texto; no se usan íconos de color ni emojis
import React from 'react'
import './TransferItemsTable.css'
import { useOpenHistory } from '@/features/audit'
import { RowActions, type RowAction } from '@/global/components/UI/molecules/table/RowActions'
import { formatDateTime } from '@/global/helpers/formatting/format'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import historyIcon from '@/assets/icons/history.svg?raw'
import shippingIcon from '@/assets/icons/shipping.svg?raw'
import receiveIcon from '@/assets/icons/check.svg?raw'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import { TRANSFER_STATUS_BADGE } from '../../constants/transfers.constants'
import type { TrasladeItem } from '../../types/transfers.types'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface TransferItemsTableProps {
  items: TrasladeItem[]
  currentWarehouseId?: number
  onDispatch: (item: TrasladeItem) => void
  onReceive: (item: TrasladeItem) => void
  onViewDetail: (item: TrasladeItem) => void
}

const COLUMNS = 9

// persona de una etapa (solicitó, despachó, recibió) con su id debajo, o el texto de cómo va esa etapa
const Person: React.FC<{ name?: string; id?: number; fallback: string }> = ({ name, id, fallback }) => (
  <>
    <span className={name ? 'transfers-table-strong' : undefined}>{name || fallback}</span>
    {id ? <small className="transfers-table-sub">ID: #{id}</small> : null}
  </>
)

export const TransferItemsTable: React.FC<TransferItemsTableProps> = ({
  items,
  currentWarehouseId,
  onDispatch,
  onReceive,
  onViewDetail,
}) => {
  const openHistory = useOpenHistory()
  const { hasScreenAccess, canPerformAction } = usePermissions()
  const canMove = canPerformAction('shop', 'transfers', 'update')
  const { pageItems, meta, setPage } = usePagedList(items, items)

  const rowActions = (item: TrasladeItem): RowAction[] => {
    const isOrigin = !currentWarehouseId || item.originWarehouse.id === currentWarehouseId
    const isDest = !currentWarehouseId || item.destWarehouse.id === currentWarehouseId

    return [
      { key: 'detail', label: 'Ver detalles', icon: eyeIcon, onClick: () => onViewDetail(item) },
      {
        key: 'history',
        label: 'Ver historial',
        icon: historyIcon,
        visible: hasScreenAccess('reports', 'audit'),
        onClick: () => openHistory('transfers', item.id),
      },
      {
        key: 'dispatch',
        label: 'Despachar traslado',
        icon: shippingIcon,
        visible: item.status === 'pending' && isOrigin && canMove,
        onClick: () => onDispatch(item),
      },
      {
        key: 'receive',
        label: 'Aceptar / Gestionar novedad',
        icon: receiveIcon,
        visible: item.status === 'in_transit' && isDest && canMove,
        onClick: () => onReceive(item),
      },
    ]
  }

  return (
    <>
    <DataTable tableId="transfers-transfer-items" className="transfers-table">
        <thead>
          <tr>
            <th>Serial</th>
            <th>Tipo</th>
            <th>Ruta</th>
            <th>Solicitado por</th>
            <th>Despachado por</th>
            <th>Recibido por</th>
            <th>Repuestos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS} className="transfers-table-message">
                <p>No hay traslados registrados con los filtros seleccionados.</p>
              </td>
            </tr>
          ) : (
            pageItems.map((item) => {
              const badge = TRANSFER_STATUS_BADGE[item.status] ?? { label: item.status, className: 'pending' }
              const isNovelty = item.status === 'with_novelty' || item.priority === 'high'
              const units = item.products.reduce((sum, p) => sum + p.quantity, 0)

              return (
                <tr key={item.id} className="transfers-table-row">
                  <td data-label="Serial">
                    <span className="transfers-table-code">{item.serialCode}</span>
                    <small className="transfers-table-sub">{item.createdAt ? formatDateTime(item.createdAt) : '—'}</small>
                  </td>
                  <td data-label="Tipo">{item.typeLabel || 'Solicitud'}</td>
                  <td data-label="Ruta">
                    {item.originWarehouse.name}
                    <span className="transfers-table-arrow" aria-hidden="true">→</span>
                    <strong className="transfers-table-strong">{item.destWarehouse.name}</strong>
                  </td>
                  <td data-label="Solicitado por">
                    <Person name={item.employeeName} id={item.employeeId} fallback="—" />
                  </td>
                  <td data-label="Despachado por">
                    <Person name={item.dispatchedByEmployeeName} id={item.dispatchedByEmployeeId} fallback={item.status === 'pending' ? 'Por despachar' : '—'} />
                  </td>
                  <td data-label="Recibido por">
                    <Person
                      name={item.receivedByEmployeeName}
                      id={item.receivedByEmployeeId}
                      fallback={item.status === 'received' ? 'Recibido' : item.status === 'with_novelty' ? 'Aceptado con novedad' : 'En tránsito'}
                    />
                  </td>
                  <td data-label="Repuestos">
                    <strong className="transfers-table-strong">{units} uds.</strong>
                    <small className="transfers-table-sub">
                      {item.products.length} {item.products.length === 1 ? 'ítem' : 'ítems'}
                    </small>
                  </td>
                  <td data-label="Estado">
                    <span className={`transfers-table-status transfers-table-status-${badge.className}`}>{badge.label}</span>
                    {isNovelty && <span className="transfers-table-priority">Alta prioridad</span>}
                  </td>
                  <td className="transfers-table-actions-cell" data-label="Acciones">
                    <RowActions actions={rowActions(item)} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </DataTable>
    <Pagination meta={meta} label="Paginación de traslados" onPageChange={setPage} />
    </>
  )
}

export default TransferItemsTable
