// ShopCatalogView · el catálogo de repuestos ya armado (barra, filtros, grid de tarjetas, paginador y avisos de carga, error o vacío); quien lo usa decide qué pasa al agregar un repuesto
// conecta con: shop.slice (filtros), shop.products.slice/selectors (productos del backend), catalogs (useLoadCatalogs), useProductsLoader y las partes ShopCatalog*; lo usan ShopCatalogScreen (carrito de ventas) y QuotationCatalogScreen (cotizaciones)
// ojo: es solo presentación: no sabe de carrito ni de cotizaciones; recibe las cantidades ya agregadas (para marcar las tarjetas) y la acción de agregar
import React from 'react'
import '../../screens/ShopCatalogScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useLoadCatalogs } from '@/features/catalogs'
import { useWarehouses } from '@/features/warehouses'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { ProductCard } from '../productCard/ProductCard'
import { ShopCatalogToolbar } from './ShopCatalogToolbar'
import { ShopCatalogFilters } from './ShopCatalogFilters'
import { ShopCatalogEmpty } from './ShopCatalogEmpty'
import { ShopCatalogStatus } from '../results/ShopCatalogStatus'
import { useProductsLoader } from '../../hooks/useProductsLoader'
import type { PriceLevelKey, Product } from '../../types/shop.types'
import { resetFilters } from '../../slices/shop.slice'
import { setProductsPage } from '../../slices/shop.products.slice'
import { loadProductsThunk } from '../../thunks/shop.products.thunks'
import { selectHasActiveFilters } from '../../selectors/shop.selectors'
import {
  selectProductsError,
  selectProductsMeta,
  selectProductsMode,
  selectProductsStatus,
  selectResultsSummary,
  selectVisibleProducts,
} from '../../selectors/shop.products.selectors'

interface ShopCatalogViewProps {
  quantities: Record<string, number> // cantidad ya agregada de cada producto (por id)
  onAdd: (product: Product, quantity: number, priceLevel: PriceLevelKey) => void
  summaryAction?: React.ReactNode // botón junto al resumen de resultados (por ejemplo, ver la cotización en armado)
}

export const ShopCatalogView: React.FC<ShopCatalogViewProps> = ({ quantities, onAdd, summaryAction }) => {
  const dispatch = useAppDispatch()
  // ojo: marcas, categorías y modelos se piden al backend la primera vez que se abre el catálogo
  useLoadCatalogs()
  // bodegas activas para indicadores de stock por sede
  useWarehouses()
  // los productos se piden cuando cambian los filtros, el texto, la página o la bodega
  useProductsLoader()

  const { filters } = useAppSelector((state) => state.shop)
  const { activeWarehouseId, activeWarehouseName } = useAppSelector((state) => state.ui)

  const products = useAppSelector(selectVisibleProducts)
  const summary = useAppSelector(selectResultsSummary)
  const status = useAppSelector(selectProductsStatus)
  const error = useAppSelector(selectProductsError)
  const meta = useAppSelector(selectProductsMeta)
  const mode = useAppSelector(selectProductsMode)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)

  // primera carga (sin nada que mostrar todavía) o error: se muestra el aviso; si ya hay productos y se está pidiendo otra página se atenúa la lista
  const showStatus = status === 'failed' || ((status === 'idle' || status === 'loading') && products.length === 0)
  const isRefreshing = status === 'loading' && products.length > 0

  return (
    <div className="shop-catalog-screen">
      {/* Barra superior de herramientas y filtros */}
      <section className="shop-catalog-toolbar">
        <ShopCatalogToolbar />
        <ShopCatalogFilters resultsCount={summary.shown} totalCount={summary.total}>
          {summaryAction}
        </ShopCatalogFilters>
      </section>

      {/* Grid de productos, aviso de carga o error, o estado vacío */}
      <section className="shop-catalog-grid-section screen-scroll">
        {showStatus ? (
          <ShopCatalogStatus status={status} error={error} onRetry={() => dispatch(loadProductsThunk())} />
        ) : products.length > 0 ? (
          <>
            <div className={`shop-catalog-products-grid ${isRefreshing ? 'shop-catalog-products-grid-loading' : ''}`}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  activeWarehouseId={activeWarehouseId}
                  selectedPriceLevel={filters.priceLevel}
                  cartQuantity={quantities[product.id] || 0}
                  onAddToCart={onAdd}
                />
              ))}
            </div>
            {mode === 'list' && meta && (
              <Pagination meta={meta} disabled={isRefreshing} label="Paginación del catálogo" onPageChange={(page) => dispatch(setProductsPage(page))} />
            )}
          </>
        ) : (
          <ShopCatalogEmpty warehouseName={activeWarehouseName} hasActiveFilters={hasActiveFilters} onReset={() => dispatch(resetFilters())} />
        )}
      </section>
    </div>
  )
}

export default ShopCatalogView
