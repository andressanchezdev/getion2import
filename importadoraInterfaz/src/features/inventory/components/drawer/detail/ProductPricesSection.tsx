// ProductPricesSection · sección «Lista de Precios» del detalle de un producto: tarifas P0..P3 y su edición
// conecta con: ProductDetailPanel (la pinta), useProductPriceEditor (estado), MoneyInput y format (pesos)
import React from 'react'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatPesos } from '@/global/helpers/formatting/format'
import type { Product, ProductPrices } from '@/features/shop'
import type { useProductPriceEditor } from '../../../hooks/useProductPriceEditor'

// nombre de cada nivel de precio
const PRICE_TIERS: Array<{ key: keyof ProductPrices; code: string; label: string }> = [
  { key: 'p0', code: 'P0', label: 'Público / Mostrador' },
  { key: 'p1', code: 'P1', label: 'Mayorista' },
  { key: 'p2', code: 'P2', label: 'Distribuidor' },
  { key: 'p3', code: 'P3', label: 'Especial' },
]

interface Props {
  product: Product
  editor: ReturnType<typeof useProductPriceEditor>
  canEdit: boolean
}

// lista de tarifas, o el formulario cuando se está editando
export const ProductPricesSection: React.FC<Props> = ({ product, editor, canEdit }) => (
  <div className="product-detail-section">
    <div className="product-section-header">
      <h4 className="product-section-title">Lista de Precios</h4>
      {canEdit && !editor.editing && (
        <button type="button" className="btn-edit-prices" onClick={editor.start}>
          Editar precios
        </button>
      )}
    </div>

    {editor.error && <div className="form-field-error-msg">{editor.error}</div>}
    {editor.success && <div className="form-field-success-msg">{editor.success}</div>}

    {editor.editing ? (
      <form className="product-prices-form" onSubmit={editor.save}>
        <div className="product-prices-edit-grid">
          {PRICE_TIERS.map((tier) => (
            <label key={tier.key} className="product-price-field">
              <span className="price-field-label">
                <strong>{tier.code}</strong> — {tier.label}
              </span>
              <div className="price-input-wrapper">
                <span className="price-prefix">$</span>
                <MoneyInput
                  className="price-input"
                  value={editor.form[tier.key] || ''}
                  placeholder="0"
                  onValueChange={(digits) => editor.change(tier.key, digits)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editor.save(e)
                  }}
                />
              </div>
            </label>
          ))}
        </div>
        <div className="prices-form-actions">
          <button type="button" className="btn-secondary" disabled={editor.saving} onClick={editor.cancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={editor.saving}>
            {editor.saving ? 'Guardando…' : 'Guardar precios'}
          </button>
        </div>
      </form>
    ) : (
      <div className="product-prices-display-list">
        {PRICE_TIERS.map((tier) => {
          const val = product.prices?.[tier.key] ?? 0
          return (
            <div key={tier.key} className="product-price-item">
              <div className="product-price-tier-tag">
                <span className="tier-code">{tier.code}</span>
                <span className="tier-name">{tier.label}</span>
              </div>
              <span className="product-price-val">{val > 0 ? formatPesos(val) : 'Sin tarifa'}</span>
            </div>
          )
        })}
      </div>
    )}
  </div>
)

export default ProductPricesSection
