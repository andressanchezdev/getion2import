// ProductDetailHero · encabezado del detalle de un producto: imagen, estado, nombre y código
// conecta con: ProductDetailPanel (lo pinta)
import React from 'react'
import type { Product } from '@/features/shop'

// imagen (o inicial) más estado, nombre y código del producto
export const ProductDetailHero: React.FC<{ product: Product; isInactive: boolean }> = ({ product, isInactive }) => (
  <div className="product-detail-hero">
    {product.imageUrl ? (
      <img className="product-detail-img" src={product.imageUrl} alt={product.name} />
    ) : (
      <div className="product-detail-img-placeholder">
        <span>{product.name.charAt(0).toUpperCase()}</span>
      </div>
    )}
    <div className="product-detail-hero-info">
      <span className={`product-status-pill ${isInactive ? 'is-inactive' : 'is-active'}`}>{isInactive ? 'Inactivo' : 'Activo'}</span>
      <h3 className="product-detail-name">{product.name}</h3>
      <p className="product-detail-code">Código: <strong>{product.code}</strong></p>
    </div>
  </div>
)

export default ProductDetailHero
