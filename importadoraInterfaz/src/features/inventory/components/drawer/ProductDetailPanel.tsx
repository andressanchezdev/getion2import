// ProductDetailPanel — panel lateral de detalle de un producto: información, QR visible, existencias y ubicación por bodega, lista de tarifas (P0..P3) y edición de precios
// conecta con: detail/ (las secciones), useProductStock (existencias), useProductPriceEditor (tarifas), usePermissions, warehouses (bodegas) y navigation (abrir otros paneles)
import React, { useEffect, useState } from 'react'
import './ProductDetailPanel.css'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { selectWarehouses } from '@/features/warehouses'
import { productLabel } from '@/features/locations'
import { qrDataUrl } from '@/global/helpers/qr/qr'
import type { Product } from '@/features/shop'
import { useProductPriceEditor } from '../../hooks/useProductPriceEditor'
import { useProductStock } from '../../hooks/useProductStock'
import { ProductDetailHero } from './detail/ProductDetailHero'
import { ProductFactsSection } from './detail/ProductFactsSection'
import { ProductPricesSection } from './detail/ProductPricesSection'
import { ProductWarehousesSection } from './detail/ProductWarehousesSection'

interface ProductDetailPanelProps {
  product: Product
}

export const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({ product: initialProduct }) => {
  const dispatch = useAppDispatch()
  const { canEditPrices, canPerformAction } = usePermissions()
  const warehouses = useAppSelector(selectWarehouses)
  const editor = useProductPriceEditor(initialProduct)
  const { product } = editor
  const { items: stockRows, status: stockStatus } = useProductStock(Number(initialProduct.id))
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const isInactive = product.status === 'inactive'
  const canEditProduct = canPerformAction('inventory', 'products', 'update') && !isInactive

  useEffect(() => {
    let active = true
    if (product.code || product.id) {
      qrDataUrl(product.code || String(product.id), 120)
        .then((url) => {
          if (active) setQrUrl(url)
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [product.code, product.id])

  const openQrLabels = () => {
    const wh = warehouses[0]
    const loc = product.location || 'BOD-01'
    dispatch(
      openDrawerForm({
        kind: 'qrLabels',
        payload: {
          heading: `Etiqueta QR de ${product.code}`,
          labels: [productLabel(wh?.id ? Number(wh.id) : 1, loc, product.code, product.name, wh?.name || 'Bodega Principal')],
        },
      })
    )
  }

  return (
    <div className="product-detail-panel">
      <div className="product-detail-body">
        <ProductDetailHero product={product} isInactive={isInactive} />

        {/* Bloque visual directo con el código QR del producto */}
        <div className="product-detail-qr-box">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR de ${product.code}`} className="product-detail-qr-img" />
          ) : (
            <div className="product-detail-qr-skeleton">QR…</div>
          )}
          <div className="product-detail-qr-text">
            <strong>Código QR del Producto</strong>
            <span>{product.code}</span>
            <small>Identificador único de trazabilidad para almacén y ventas</small>
          </div>
        </div>

        <ProductFactsSection product={product} />
        <ProductWarehousesSection
          product={product}
          warehouses={warehouses}
          stockRows={stockRows}
          loading={stockStatus === 'idle' || stockStatus === 'loading'}
        />
        <ProductPricesSection product={product} editor={editor} canEdit={canEditPrices} />
      </div>

      <div className="product-detail-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cerrar
        </button>
        <button type="button" className="btn-secondary" onClick={openQrLabels} title="Generar e imprimir hoja de etiquetas QR">
          Imprimir hoja QR
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!canEditProduct}
          title={isInactive ? 'No se puede editar un producto inactivo' : undefined}
          onClick={() => dispatch(openDrawerForm({ kind: 'editProduct', payload: product }))}
        >
          Editar producto
        </button>
      </div>
    </div>
  )
}

export default ProductDetailPanel
