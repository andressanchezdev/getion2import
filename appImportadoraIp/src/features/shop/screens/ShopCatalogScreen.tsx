// ShopCatalogScreen · catálogo de repuestos: arma la barra, los filtros, el grid de tarjetas, el paginador o el aviso de carga, error o estado vacío
// conecta con: shop.slice (filtros y carrito), shop.products.slice/selectors (productos del backend), catalogs (useLoadCatalogs), useProductsLoader y las partes ShopCatalog*; la monta MainContent
// ojo: la lista de productos ya no es un dato fijo: llega de POST /products (o de la búsqueda por texto) y se pide en useProductsLoader
import React from 'react'
import './ShopCatalogScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useLoadCatalogs } from '@/features/catalogs'
import { ProductCard } from '../components/productCard/ProductCard'
import { ShopCatalogToolbar } from '../components/catalog/ShopCatalogToolbar'
import { ShopCatalogFilters } from '../components/catalog/ShopCatalogFilters'
import { ShopCatalogEmpty } from '../components/catalog/ShopCatalogEmpty'
import { ShopCatalogStatus } from '../components/results/ShopCatalogStatus'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { useProductsLoader } from '../hooks/useProductsLoader'
import type { PriceLevelKey, Product } from '../types/shop.types'
import { resetFilters } from '../slices/shop.slice'
import { setProductsPage } from '../slices/shop.products.slice'
import { loadProductsThunk } from '../thunks/shop.products.thunks'
import { addToCartThunk } from '../thunks/shop.cart.thunks'
import { selectCartQuantities, selectHasActiveFilters } from '../selectors/shop.selectors'
import {
  selectProductsError,
  selectProductsMeta,
  selectProductsMode,
  selectProductsStatus,
  selectResultsSummary,
  selectVisibleProducts,
} from '../selectors/shop.products.selectors'

export const ShopCatalogScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  // ojo: marcas, categorías y modelos se piden al backend la primera vez que se abre el catálogo
  useLoadCatalogs()
  // los productos se piden cuando cambian los filtros, el texto, la página o la bodega
  useProductsLoader()

  const { filters } = useAppSelector((state) => state.shop)
  const { activeWarehouseId, activeWarehouseName } = useAppSelector((state) => state.ui)

  // Cantidad de cada producto en el carrito (para sincronizar con ProductCard)
  const cartQuantities = useAppSelector(selectCartQuantities)

  const products = useAppSelector(selectVisibleProducts)
  const summary = useAppSelector(selectResultsSummary)
  const status = useAppSelector(selectProductsStatus)
  const error = useAppSelector(selectProductsError)
  const meta = useAppSelector(selectProductsMeta)
  const mode = useAppSelector(selectProductsMode)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)

  const handleAddToCart = (
    product: Product,
    quantity: number,
    priceLevel: PriceLevelKey
  ) => {
    // ojo: antes se agregaba a un carrito local; ahora es una llamada al backend (POST /carts/register, o PUT /carts/update si el producto ya estaba)
    dispatch(addToCartThunk({ product, quantity, priceLevel }))
  }

  // primera carga (sin nada que mostrar todavía) o error: se muestra el aviso; si ya hay productos y se está pidiendo otra página se atenúa la lista
  const showStatus = status === 'failed' || ((status === 'idle' || status === 'loading') && products.length === 0)
  const isRefreshing = status === 'loading' && products.length > 0

  return (
    <div className="shop-catalog-screen">
      {/* Barra Superior de Herramientas y Filtros */}
      <section className="shop-catalog-toolbar">
        <ShopCatalogToolbar />
        <ShopCatalogFilters resultsCount={summary.shown} totalCount={summary.total} />
      </section>

      {/* Grid de Productos, aviso de carga o error, o Estado Vacío */}
      <section className="shop-catalog-grid-section">
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
                  cartQuantity={cartQuantities[product.id] || 0}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
            {mode === 'list' && meta && (
              <Pagination
                meta={meta}
                disabled={isRefreshing}
                label="Paginación del catálogo"
                onPageChange={(page) => dispatch(setProductsPage(page))}
              />
            )}
          </>
        ) : (
          <ShopCatalogEmpty
            warehouseName={activeWarehouseName}
            hasActiveFilters={hasActiveFilters}
            onReset={() => dispatch(resetFilters())}
          />
        )}
      </section>
    </div>
  )
}

export default ShopCatalogScreen
