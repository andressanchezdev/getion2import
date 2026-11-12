// PurchasesTable · tarjeta de órdenes de compra con buscador, filtros de bodega y estado, y tabla global
// conecta con: PurchaseOrdersScreen y ReceivingScreen (la usan), usePurchases y usePurchaseActions, RowActions, Pill, ConfirmDialog, Pagination y navigation
import React, { useState } from 'react'
import './PurchasesTable.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import fileIcon from '@/assets/icons/file-text.svg?raw'
import receiveIcon from '@/assets/icons/shipping.svg?raw'
import banIcon from '@/assets/icons/ban.svg?raw'
import walletIcon from '@/assets/icons/wallet.svg?raw'
import { PURCHASE_STATUS, PURCHASE_STATUS_OPTIONS } from '../../constants/purchases.constants'
import { canPay, canReceive, pendingToPay } from '../../helpers/purchases.rules'
import { usePurchaseActions } from '../../hooks/usePurchaseActions'
import { usePurchases, type PurchasesMode } from '../../hooks/usePurchases'
import type { Purchase, PurchaseStatus } from '../../types/purchases.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { ActionsHeader } from '@/global/components/UI/molecules/table/ActionsHeader'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

export const PurchasesTable: React.FC<{ mode: PurchasesMode }> = ({ mode }) => {
  const dispatch = useAppDispatch()
  const list = usePurchases(mode)
  const actions = usePurchaseActions()
  const [toVoid, setToVoid] = useState<Purchase | null>(null)
  const { pageItems, meta, setPage } = usePagedList(list.items, `${list.search}|${list.status}|${list.selectedWarehouseId}|${mode}`)
  const receiving = mode === 'receiving'
  // pagar la recepción es de la caja: lo hace quien puede editar en Caja
  const { can } = usePermissions()
  const canPayFromCash = can('cash:edit')

  const warehouseOptions = [
    { value: 'all', label: 'Todas las bodegas' },
    ...list.warehouses.map((wh) => ({ value: String(wh.id), label: wh.name })),
  ]

  const message = list.failed
    ? list.error
    : list.loading
      ? 'Cargando compras…'
      : list.items.length === 0
        ? list.hasFilters
          ? 'No hay órdenes que coincidan con la búsqueda.'
          : receiving
            ? 'No hay órdenes esperando mercancía.'
            : 'Todavía no hay órdenes de compra registradas.'
        : null

  const confirmVoid = async (reason: string) => {
    const target = toVoid
    setToVoid(null)
    if (target) await actions.voidOrder(target, reason)
  }

  return (
    <div className="data-card">
      <div className="data-toolbar purchases-toolbar">
        <SearchBar
          value={list.search}
          onChange={list.setSearch}
          hasActiveFilters={list.hasFilters}
          onClear={list.clearFilters}
          placeholder="Buscar por orden, proveedor o referencia..."
          className="purchases-search"
        />
        <div className="purchases-toolbar-middle">
          <FilterSelect
            label="Bodega"
            allLabel="Todas las bodegas"
            emptyValue="all"
            value={list.selectedWarehouseId ? String(list.selectedWarehouseId) : 'all'}
            options={warehouseOptions}
            onChange={(val) => list.setSelectedWarehouseId(!val || val === 'all' ? null : Number(val))}
          />
          <FilterSelect
            label="Estado"
            allLabel="Todos los estados"
            emptyValue="all"
            value={list.status}
            options={PURCHASE_STATUS_OPTIONS}
            onChange={(val) => list.setStatus((val || 'all') as PurchaseStatus | 'all')}
          />
        </div>
        <div className="purchases-toolbar-actions">
          <span className="purchases-count" aria-live="polite">
            {list.items.length} de {list.total} órdenes
          </span>
          {!receiving && can('purchases:create') && (
            <button
              type="button"
              className="btn-primary purchases-create"
              onClick={() => dispatch(openDrawerForm({ kind: 'purchaseForm' }))}
            >
              <Icon svg={plusIcon} /> Nueva orden
            </button>
          )}
        </div>
      </div>

      <DataTable tableId="purchases-purchases">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Proveedor</th>
            <th>Bodega Destino</th>
            <th>Creada</th>
            <th>Esperada</th>
            <th>Referencia</th>
            <th className="purchases-num">Total</th>
            <th>Estado</th>
            {receiving && <th>Pago</th>}
            <ActionsHeader />
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={receiving ? 10 : 9} className="purchases-empty">{message}</td>
            </tr>
          ) : (
            pageItems.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  <strong>
                    <CopyableCell text={purchase.serial} label="Orden de compra" />
                  </strong>
                </td>
                <td>{purchase.supplierName}</td>
                <td>
                  <strong className="purchases-table-wh">{purchase.warehouseName || 'Bodega Principal'}</strong>
                </td>
                <td>{purchase.createdAt || '—'}</td>
                <td>{purchase.expectedDate || '—'}</td>
                <td>{purchase.supplierRef || '—'}</td>
                <td className="purchases-num table-amount">{formatCOP(purchase.total)}</td>
                <td><Pill tone={PURCHASE_STATUS[purchase.status].tone}>{PURCHASE_STATUS[purchase.status].label}</Pill></td>
                {receiving && (
                  <td>
                    <Pill tone={purchase.paidTotal <= 0 ? 'gray' : pendingToPay(purchase) > 0 ? 'amber' : 'green'}>
                      {purchase.paidTotal <= 0 ? 'Sin pagar' : pendingToPay(purchase) > 0 ? `Pagado ${formatCOP(purchase.paidTotal)}` : 'Pagada'}
                    </Pill>
                  </td>
                )}
                <td>
                  <RowActions
                    actions={[
                      { key: 'detail', label: `Ver la orden ${purchase.serial}`, icon: eyeIcon, onClick: () => dispatch(openDrawerForm({ kind: 'purchaseDetail', payload: { id: purchase.id } })) },
                      { key: 'receive', label: `Recibir mercancía de ${purchase.serial}`, icon: receiveIcon, tone: 'success', visible: canReceive(purchase) && can('purchases:receive'), onClick: () => dispatch(openDrawerForm({ kind: 'purchaseReceive', payload: { id: purchase.id } })) },
                      { key: 'pay', label: `Pagar la recepción de ${purchase.serial} desde la caja`, icon: walletIcon, tone: 'success', visible: receiving && canPayFromCash && canPay(purchase), onClick: () => dispatch(openDrawerForm({ kind: 'purchasePay', payload: { id: purchase.id } })) },
                      { key: 'excel', label: `Bajar el Excel de ${purchase.serial}`, icon: fileIcon, onClick: () => actions.exportExcel(purchase) },
                      { key: 'void', label: `Anular la orden ${purchase.serial}`, icon: banIcon, tone: 'danger', visible: purchase.status === 'ordered' && can('purchases:edit'), onClick: () => setToVoid(purchase) },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <Pagination meta={meta} label="Paginación de compras" onPageChange={setPage} />

      <ReasonPrompt
        open={toVoid !== null}
        title={`Anular la orden ${toVoid?.serial ?? ''}`}
        message="Esta orden quedará anulada y no podrá recibir mercancía. El consecutivo se conservará como anulado. Indica el motivo para dejar constancia."
        confirmLabel="Anular orden"
        onConfirm={confirmVoid}
        onCancel={() => setToVoid(null)}
      />
    </div>
  )
}

export default PurchasesTable
