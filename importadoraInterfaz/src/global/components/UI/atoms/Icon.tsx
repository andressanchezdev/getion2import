// Icon · ícono de línea del ERP: pinta un SVG de assets/icons (import con ?raw) con el color del texto y el tamaño de la letra
// conecta con: Icon.css; lo usan los botones con llamado a la acción, la campanita y los avisos; es el único camino para mostrar íconos fuera de RowActions
// ojo: todos los íconos del ERP son de línea (trazo 2, 24x24, currentColor) como los del menú lateral; no se usan emojis ni íconos de colores
import React from 'react'
import './Icon.css'

interface IconProps {
  svg: string // contenido del svg (import de assets/icons con ?raw)
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Icon: React.FC<IconProps> = ({ svg, size = 'md', className = '' }) => (
  <span className={`ui-icon ui-icon-${size} ${className}`.trim()} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
)

export default Icon
