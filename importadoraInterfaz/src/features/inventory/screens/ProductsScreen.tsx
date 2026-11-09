// ProductsScreen · Inventario > Productos: tabla de productos con búsqueda, botón de nuevo producto, el stock de la bodega activa y paginador
// conecta con: useProductsTable (los pide), ProductsTable, inventory.slice (búsqueda y página), global SearchBar y Pagination; la monta MainContent (screenRegistry)
import React from 'react'
import '../components/InventoryTables.css'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import { ProductsTable } from '../components/table/ProductsTable'
import { useProductsTable } from '../hooks/useInventoryTables'
import { setInventoryPage, setInventoryQuery } from '../slices/inventory.slice'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

export const ProductsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { meta, status, query } = useProductsTable()
  const canCreate = usePermissions().canPerformAction('inventory', 'products', 'create')

  return (
    <div className="inv-screen">
      <div className="data-card">
        <div className="data-toolbar inv-toolbar">
          <SearchBar
            value={query}
            onChange={(value) => dispatch(setInventoryQuery({ table: 'products', query: value }))}
            hasActiveFilters={Boolean(query)}
            onClear={() => dispatch(setInventoryQuery({ table: 'products', query: '' }))}
            placeholder="Buscar por código, nombre, marca, modelo o categoría..."
            className="inv-search"
          />
          <div className="inv-toolbar-actions">
            {meta && <span className="inv-count">{meta.totalRecords} productos</span>}
            {canCreate && (
              <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'createProduct' }))}>
                <Icon svg={plusIcon} /> Nuevo producto
              </button>
            )}
          </div>
        </div>
        <ProductsTable />
      </div>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación de productos" onPageChange={(page) => dispatch(setInventoryPage({ table: 'products', page }))} />}
    </div>
  )
}

export default ProductsScreen
