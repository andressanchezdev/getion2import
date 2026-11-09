// ProductCardIcons · iconos de la tarjeta (favoritos, vista rápida, tarifas y ubicación), sin color propio
// conecta con: ProductCardMedia (favoritos y vista rápida), ProductCardTierMenu (tarifas), ProductCardInfo (ubicación)
import React from 'react'

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
