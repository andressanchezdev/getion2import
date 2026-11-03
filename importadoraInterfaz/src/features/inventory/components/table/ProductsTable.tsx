// ProductsTable · tabla de productos: imagen, código, nombre, marca, categoría, ubicación, precio (P0), vendible, estado y acciones (detalle, editar, ubicaciones y QR); el estado se cambia desde un desplegable en su columna
// conecta con: ProductsScreen (la usa), inventory.selectors (productos y estado), useProductStatus (activar o desactivar), shop.helpers, RowActions y DrawerRight (productDetail, editProduct, productLocations y qrLabels)
// ojo: la tabla muestra también los productos inactivos (para poder reactivarlos); la administración no depende de tener una bodega elegida
import React from 'react'
import '../InventoryTables.css'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { getAvailableLevels, getPriceByLevel, getWarehouseStock, type Product } from '@/features/shop'
import { selectProductsTable } from '../../selectors/inventory.selectors'
import { useProductStatus } from '../../hooks/useProductStatus'
import { loadProductsTableThunk } from '../../thunks/inventory.thunks'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import mapPinIcon from '@/assets/icons/map-pin.svg?raw'

export const ProductsTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, page, query } = useAppSelector(selectProductsTable)
  const warehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const { canPerformAction, isAdmin } = usePermissions()
  const { updatingId, changeStatus } = useProductStatus()

  const canManage = isAdmin || canPerformAction('inventory', 'products', 'update')

  const message =
    status === 'failed'
      ? error
      : items.length === 0
      ? status === 'succeeded'
        ? 'No se encontraron productos.'
        : 'Cargando productos…'
      : null

  // acciones de una fila según el estado del producto y los permisos
  const actionsOf = (product: Product) => {
    const isInactive = product.status === 'inactive'
    return [
      { key: 'detail', label: 'Ver detalles del producto', icon: eyeIcon, onClick: () => dispatch(openDrawerForm({ kind: 'productDetail', payload: product })) },
      {
        key: 'edit',
        label: isInactive ? 'Activa el producto para editarlo' : 'Editar producto',
        icon: editIcon,
        visible: canManage && !isInactive,
        onClick: () => dispatch(openDrawerForm({ kind: 'editProduct', payload: product })),
      },
      { key: 'locations', label: 'Ubicaciones y existencias por bodega', icon: mapPinIcon, onClick: () => dispatch(openDrawerForm({ kind: 'productLocations', payload: product })) },
      
    ]
  }

  return (
    <div className="inv-table-responsive table-scroll">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Código</th>
            <th>Producto</th>
            <th>Marca</th>
            <th>Categoría</th>
            <th>Ubicación</th>
            <th className="inv-num">Precio</th>
            <th className="inv-num">Vendible</th>
            <th>Estado</th>
            <th className="inv-actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={10} className="inv-message">
                <p>{message}</p>
                {status === 'failed' && (
                  <button type="button" className="btn-secondary" onClick={() => dispatch(loadProductsTableThunk({ page, query }))}>
                    Reintentar
                  </button>
                )}
              </td>
            </tr>
          ) : (
            items.map((product) => {
              const level = getAvailableLevels(product)[0]
              const isInactive = product.status === 'inactive'
              return (
                <tr key={product.id} className={isInactive ? 'inv-row-inactive' : ''}>
                  <td>{product.imageUrl ? <img className="inv-thumb" src={product.imageUrl} alt="" loading="lazy" /> : <span className="inv-thumb-empty">—</span>}</td>
                  <td>
                    <span className="inv-code">{product.code}</span>
                  </td>
                  <td className="inv-name">{product.name}</td>
                  <td>{product.brand || '—'}</td>
                  <td>{product.category || '—'}</td>
                  <td>
                    <span className="inv-loc" title={product.locations?.join(', ')}>
                      {product.location || '—'}
                      {(product.locations?.length ?? 0) > 1 ? ` +${(product.locations?.length ?? 1) - 1}` : ''}
                    </span>
                  </td>
                  <td className="inv-num table-amount">{level ? formatPesos(getPriceByLevel(product, level)) : 'Sin precio'}</td>
                  <td className="inv-num">
                    <b>{getWarehouseStock(product, warehouseId)}</b>
                  </td>
                  <td>
                    <select
                      className={`inv-status-select is-${isInactive ? 'inactive' : 'active'}`}
                      value={isInactive ? 'inactive' : 'active'}
                      disabled={!canManage || updatingId === product.id}
                      aria-label={`Estado de ${product.code}`}
                      title={canManage ? 'Cambiar estado' : 'Solo administradores o usuarios con permiso pueden modificar el estado'}
                      onChange={(event) => changeStatus(product, event.target.value as 'active' | 'inactive')}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                  <td>
                    <RowActions actions={actionsOf(product)} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ProductsTable
