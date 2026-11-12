// WarehouseStockRow · una fila de la tabla de existencias de la bodega: datos del repuesto y sus acciones (ver, reubicar, solicitar traslado)
// conecta con: WarehouseProductsTable (la pinta), RowActions, usePermissions y navigation (abre producto, reubicar y nuevo traslado en el panel derecho)
import React from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import shippingIcon from '@/assets/icons/shipping.svg?raw'
import type { useWarehouseStock } from '../../hooks/useWarehouseStock'

type StockItem = ReturnType<typeof useWarehouseStock>['items'][number]

interface WarehouseStockRowProps {
  row: StockItem
  warehouseId: number
  onRelocated: () => void // recarga las existencias cuando se reubica
}

// fila con sus acciones según los permisos
export const WarehouseStockRow: React.FC<WarehouseStockRowProps> = ({ row, warehouseId, onRelocated }) => {
  const dispatch = useAppDispatch()
  const { can } = usePermissions()
  const canCreate = can('transfers:create')
  const canMove = can('stock:relocate')

  const open = (kind: 'productDetail' | 'relocateStock' | 'createTransfer', payload: unknown) =>
    dispatch(openDrawerForm({ kind, payload } as Parameters<typeof openDrawerForm>[0]))

  return (
    <tr>
      <td>
        <span className="inv-code">
          <CopyableCell text={row.productCode ?? ''} label="Código de producto" />
        </span>
      </td>
      <td className="inv-name">{row.productName}</td>
      <td>{row.brandName || '—'}</td>
      <td>
        <span className="inv-loc">{row.location || 'Sin estante'}</span>
      </td>
      <td className="inv-num">{row.available}</td>
      <td className="inv-num">{row.reserved}</td>
      <td className="inv-num">
        <b>{row.sellable}</b>
      </td>
      <td>
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Ver detalles del producto',
              icon: eyeIcon,
              onClick: () =>
                open('productDetail', {
                  id: String(row.productId),
                  code: row.productCode || '',
                  name: row.productName || '',
                  brand: row.brandName || '',
                  category: row.categoryName || '',
                  location: row.location || '',
                  prices: { p0: 0, p1: 0, p2: 0, p3: 0 },
                  stockByWarehouse: { [String(warehouseId)]: row.sellable },
                }),
            },
            {
              key: 'relocate',
              label: 'Reubicar dentro de esta bodega',
              icon: editIcon,
              visible: canMove,
              onClick: () =>
                open('relocateStock', {
                  stockId: row.stockId,
                  warehouseId,
                  productId: row.productId,
                  productCode: row.productCode || '',
                  productName: row.productName || '',
                  currentLocation: row.location || '',
                  availableQuantity: row.available,
                  onSuccess: onRelocated,
                }),
            },
            {
              key: 'request',
              label: 'Solicitar traslado desde otra bodega',
              icon: shippingIcon,
              visible: canCreate,
              onClick: () =>
                open('createTransfer', {
                  product: { id: String(row.productId), code: row.productCode || '', name: row.productName || '' },
                  destinationWarehouseId: warehouseId,
                }),
            },
          ]}
        />
      </td>
    </tr>
  )
}

export default WarehouseStockRow
