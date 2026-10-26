// shop.slice · estado de tienda que se guarda en el navegador: filtros, uuid, niveles y cliente del carrito, y selección de producto
// conecta con: ShopCatalogScreen, ProductCard, ShopCartDrawer
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PriceLevelKey } from '../types/shop.types'
import { addToCartThunk } from '../thunks/shop.cart.thunks'
import { clearCartThunk } from '../thunks/shop.cart.update.thunks'
import { setCartCustomerThunk } from '../thunks/shop.cart.customer.thunks'
import { checkoutThunk } from '../thunks/shop.checkout.thunks'
import { resumeCartThunk } from '../thunks/shop.cart.resume.thunks'
import { INITIAL_SHOP_STATE } from '../constants/shop.constants'

const LOGOUT_FULFILLED = 'auth/logout/fulfilled'

export const shopSlice = createSlice({
    name: 'shop',
    initialState: INITIAL_SHOP_STATE,
    reducers: {
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.filters.searchQuery = action.payload
        },
        setSelectedCategory: (state, action: PayloadAction<number | null>) => {
            state.filters.selectedCategoryId = action.payload
        },
        setSelectedBrand: (state, action: PayloadAction<number | null>) => {
            state.filters.selectedBrandId = action.payload
        },
        setOnlyInStock: (state, action: PayloadAction<boolean>) => {
            state.filters.onlyInStock = action.payload
        },
        setPriceLevel: (state, action: PayloadAction<PriceLevelKey>) => {
            state.filters.priceLevel = action.payload
        },
        resetFilters: (state) => {
            state.filters = {
                ...INITIAL_SHOP_STATE.filters,
                priceLevel: state.filters.priceLevel, // conserva el nivel de precio seleccionado
            }
        },
        // ojo: addToCart, updateCartQuantity, removeFromCart y clearCart eran del carrito local; ahora son thunks contra el backend (shop.cart.thunks)
        toggleCartDrawer: (state) => {
            state.isCartDrawerOpen = !state.isCartDrawerOpen
        },
        setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
            state.isCartDrawerOpen = action.payload
        },
        setSelectedProductId: (state, action: PayloadAction<string | null>) => {
            state.selectedProductId = action.payload
        },
        // ojo: applyStockUpdate (tiempo real) se movió a shop.products.slice porque la lista de productos ya no está en este slice
    },
    extraReducers: (builder) => {
        builder
            // al agregar un producto se guarda el uuid del carrito (se crea con el primero) y con qué nivel de precio se agregó (el backend no lo guarda)
            .addCase(addToCartThunk.fulfilled, (state, action) => {
                state.cartUuid = action.payload.uuid
                state.cartLevels[action.meta.arg.product.id] = action.meta.arg.priceLevel
            })
            // al elegir o quitar el cliente de la venta se guarda; si el cliente trae nivel de precio (P0..P3) ese pasa a ser el del catálogo
            .addCase(setCartCustomerThunk.fulfilled, (state, action) => {
                state.cartCustomer = action.payload.customer
                const level = action.payload.customer?.priceType?.toUpperCase()
                if (level === 'P0' || level === 'P1' || level === 'P2' || level === 'P3') state.filters.priceLevel = level
            })
            // al vaciar el carrito se olvidan los niveles
            .addCase(clearCartThunk.fulfilled, (state) => {
                state.cartLevels = {}
            })
            // al retomar un carrito guardado se adopta su uuid y su cliente (las líneas ya se leyeron con éxito)
            .addCase(resumeCartThunk.fulfilled, (state, action) => {
                state.cartUuid = action.payload.uuid
                state.cartCustomer = action.payload.customer
                state.cartLevels = {}
            })
            // al registrar la venta el carrito ya se consumió: la próxima venta empieza con uuid y cliente nuevos
            .addCase(checkoutThunk.fulfilled, (state) => {
                state.cartUuid = ''
                state.cartLevels = {}
                state.cartCustomer = null
            })
            // al cerrar sesión se olvida el carrito de ese usuario (otro usuario en el mismo navegador no hereda su uuid)
            // ojo: se detecta por el nombre de la acción ('auth/logout') en vez de importar logoutThunk, para que shop no dependa en tiempo de ejecución de auth
            .addMatcher(
                (action) => action.type === LOGOUT_FULFILLED,
                (state) => {
                    state.cartUuid = ''
                    state.cartLevels = {}
                    state.cartCustomer = null
                }
            )
    },
})

export const {
    setSearchQuery,
    setSelectedCategory,
    setSelectedBrand,
    setOnlyInStock,
    setPriceLevel,
    resetFilters,
    toggleCartDrawer,
    setCartDrawerOpen,
    setSelectedProductId,
} = shopSlice.actions

export const shopReducer = shopSlice.reducer
export default shopSlice.reducer
