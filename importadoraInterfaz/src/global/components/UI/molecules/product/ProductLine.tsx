// ProductLine · una línea de producto para los paneles laterales: imagen, nombre, marca y modelo, código, cantidad × precio y total
// conecta con: ProductLine.css (la tarjeta del carrito con el orden de datos del detalle de cotización) y Icon (imagen de reemplazo); la usan los paneles de cotización, pedido, compra y traslado
// ojo: es solo de lectura; si la línea necesita editar (como el carrito) lleva su control en el hueco `trailing`; sin imagen se muestra el ícono de paquete, así todas las líneas se ven iguales
import React from 'react'
import './ProductLine.css'
import { Icon } from '@/global/components/UI/atoms/Icon'
import { formatPesos } from '@/global/helpers/formatting/format'
import packageIcon from '@/assets/icons/package-alt-2-svgrepo-com.svg?raw'

export interface ProductLineProps {
  name: string
  code?: string
  imageUrl?: string | null
  meta?: string // marca · modelo, o lo que ayude a reconocer el repuesto
  quantity: number
  unitPrice?: number
  total?: number
  note?: string // dato extra de la línea (por ejemplo, de qué bodega sale)
  trailing?: React.ReactNode
}

export const ProductLine: React.FC<ProductLineProps> = ({ name, code, imageUrl, meta, quantity, unitPrice, total, note, trailing }) => (
  <li className="product-line">
    <div className="product-line-slot">
      {imageUrl ? <img className="product-line-image" src={imageUrl} alt="" loading="lazy" /> : <Icon svg={packageIcon} size="lg" className="product-line-placeholder" />}
    </div>

    <div className="product-line-main">
      <strong className="product-line-name" title={name}>{name.toUpperCase()}</strong>
      {meta && <span className="product-line-meta">{meta}</span>}
      {code && <span className="product-line-ref">{code}</span>}
      {note && <span className="product-line-meta">{note}</span>}

      <div className="product-line-foot">
        <span className="product-line-qty">× {quantity}</span>
        {unitPrice !== undefined && <span className="product-line-prices">{formatPesos(unitPrice)}</span>}
        {total !== undefined && <strong className="product-line-total">{formatPesos(total)}</strong>}
      </div>
    </div>

    {trailing && <div className="product-line-trailing">{trailing}</div>}
  </li>
)

export const ProductLineList: React.FC<{ children: React.ReactNode }> = ({ children }) => <ul className="product-line-list">{children}</ul>

export default ProductLine
