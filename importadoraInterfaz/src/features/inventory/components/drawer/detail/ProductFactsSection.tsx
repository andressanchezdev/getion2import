// ProductFactsSection · sección «Información General» del detalle de un producto: marca, categoría, modelo, ubicación y descripción
// conecta con: ProductDetailPanel (la pinta)
import React from 'react'
import type { Product } from '@/features/shop'

// una pareja nombre/valor de la rejilla de datos
const Fact: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="product-fact">
    <dt>{label}</dt>
    <dd>{value || '—'}</dd>
  </div>
)

// datos técnicos del producto
export const ProductFactsSection: React.FC<{ product: Product }> = ({ product }) => {
  const match = product.description ? product.description.match(/Modelos compatibles:\s*([^\n]+)/i) : null
  const compatibleModels = match ? match[1] : undefined
  const cleanDesc = product.description ? product.description.replace(/\n?Modelos compatibles:\s*[^\n]+/i, '').trim() : ''

  return (
    <div className="product-detail-section">
      <h4 className="product-section-title">Información General</h4>
      <dl className="product-facts-grid">
        <Fact label="Marca" value={product.brand} />
        <Fact label="Categoría" value={product.category} />
        <Fact label="Modelo Principal" value={product.modelCompatible} />
        {compatibleModels && <Fact label="Modelos Compatibles" value={compatibleModels} />}
        <Fact label="Ubicación Actual" value={product.location} />
      </dl>
      {cleanDesc && (
        <div className="product-description-box">
          <span className="product-desc-label">Descripción:</span>
          <p>{cleanDesc}</p>
        </div>
      )}
    </div>
  )
}

export default ProductFactsSection
