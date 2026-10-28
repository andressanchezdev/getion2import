// ShopIcons · íconos de la tienda sin color propio (lupa del buscador del carrito y papelera de quitar una línea)
// conecta con: ShopCartSearch (lupa) y ShopCartItem (papelera); los íconos de la card (etiqueta y ubicación) siguen en productCard/parts/ProductCardIcons
import React from 'react'

// lupa del buscador del carrito
export const SearchIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

// papelera de quitar una línea del carrito
export const TrashIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
    </svg>
)
