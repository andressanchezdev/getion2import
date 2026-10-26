// ProductCardIcons · iconos de la tarjeta (favoritos, vista rápida, tarifas y ubicación), sin color propio
// conecta con: ProductCardMedia (favoritos y vista rápida), ProductCardTierMenu (tarifas), ProductCardInfo (ubicación)
import React from 'react'

// corazón vacío (mismo trazo que el de Yamaha)
export const HeartIcon: React.FC = () => (
    <svg viewBox="0 0 20 17.66" aria-hidden="true" fill="currentColor">
        <path d="M10,1.53a6,6,0,0,0-8.24,8.71l6.83,6.83a2,2,0,0,0,2.82,0l6.83-6.83A6,6,0,0,0,10,1.53ZM8.83,3.17l.46.47a1,1,0,0,0,1.42,0l.46-.47a4,4,0,1,1,5.66,5.66L10,15.66,3.17,8.83A4,4,0,0,1,8.83,3.17Z" />
    </svg>
)

// círculo con + (vista rápida)
export const QuickViewIcon: React.FC = () => (
    <svg viewBox="0 0 21 21" aria-hidden="true" fill="currentColor">
        <path d="M10.1727 2.00003C6.05908 2.00003 2.72437 5.58175 2.72437 10C2.72437 14.4183 6.05908 18 10.1727 18C14.2862 18 17.6209 14.4183 17.6209 10C17.6209 5.58175 14.2862 2.00003 10.1727 2.00003ZM0.862305 10C0.862305 4.47718 5.03069 3.05176e-05 10.1727 3.05176e-05C15.3146 3.05176e-05 19.483 4.47718 19.483 10C19.483 15.5229 15.3146 20 10.1727 20C5.03069 20 0.862305 15.5229 0.862305 10ZM10.1727 5.00003C10.6868 5.00003 11.1037 5.44775 11.1037 6.00003V9.00003H13.8968C14.411 9.00003 14.8278 9.44775 14.8278 10C14.8278 10.5523 14.411 11 13.8968 11H11.1037V14C11.1037 14.5523 10.6868 15 10.1727 15C9.65845 15 9.24162 14.5523 9.24162 14V11H6.44851C5.93432 11 5.51748 10.5523 5.51748 10C5.51748 9.44775 5.93432 9.00003 6.44851 9.00003H9.24162V6.00003C9.24162 5.44775 9.65845 5.00003 10.1727 5.00003Z" />
    </svg>
)

// etiqueta de precio (menú de tarifas P0 - P3)
export const TagIcon: React.FC = () => (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M2.5 10.2V3.6a1.1 1.1 0 0 1 1.1-1.1h6.6a1.1 1.1 0 0 1 .8.3l6.7 6.7a1.1 1.1 0 0 1 0 1.6l-6.1 6.1a1.1 1.1 0 0 1-1.6 0L2.8 11a1.1 1.1 0 0 1-.3-.8Z" />
        <circle cx="6.6" cy="6.6" r="1.2" />
    </svg>
)

// gota invertida sin color (ubicación en estantería)
export const PinIcon: React.FC = () => (
    <svg viewBox="0 0 12 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M6 13C6 13 1.5 8.6 1.5 5.5a4.5 4.5 0 0 1 9 0C10.5 8.6 6 13 6 13Z" />
        <circle cx="6" cy="5.5" r="1.5" />
    </svg>
)
