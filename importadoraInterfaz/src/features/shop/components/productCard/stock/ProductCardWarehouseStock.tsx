// ProductCardWarehouseStock · indicador horizontal de stock por bodega sobre la tarjeta de producto
// conecta con: ProductCardMedia; lee bodegas de warehouses.selectors; al hacer clic agrega el repuesto a la solicitud de traslado en DrawerRight
import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { fetchWarehousesThunk, selectWarehouses } from '@/features/warehouses'
import { openDrawerForm } from '@/features/navigation'
import { addTransferDraftLine } from '@/features/transfers'
import { toast } from '@/global/helpers/feedback/toast'
import type { Product } from '../../../types/shop.types'
import './ProductCardWarehouseStock.css'

interface ProductCardWarehouseStockProps {
    product: Product
}

function formatWarehouseCode(code?: string, index = 0): string {
    if (!code) return `B-${String(index + 1).padStart(2, '0')}`
    const match = code.match(/\d+/)
    if (match) {
        return `B-${match[0].padStart(2, '0')}`
    }
    return code.startsWith('B-') ? code : `B-${code.replace(/^BOD-?/i, '')}`
}

// cantidades del producto por bodega; al hacer clic en una agrega o inicia la solicitud de traslado
export const ProductCardWarehouseStock: React.FC<ProductCardWarehouseStockProps> = ({ product }) => {
    const dispatch = useAppDispatch()
    const warehouses = useAppSelector(selectWarehouses)
    const status = useAppSelector((state) => state.warehouses.status)
    const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
    const currentUser = useAppSelector((state) => state.auth.user)
    const draft = useAppSelector((state) => state.transfers.draft)

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchWarehousesThunk())
        }
    }, [dispatch, status])

    const hasWarehouseList = Boolean(warehouses && warehouses.length > 0)
    const stockEntries = Object.entries(product.stockByWarehouse ?? {})
    if (!hasWarehouseList && stockEntries.length === 0) return null

    const handleBadgeClick = (e: React.MouseEvent, whId: number | string, whName: string, availableQty: number) => {
        e.stopPropagation()
        const originId = Number(whId)

        if (availableQty <= 0) {
            toast.warning(`No hay existencias disponibles de este producto en ${whName}.`)
            return
        }

        const isEmployee = currentUser?.userType?.toLowerCase() === 'employee'
        const employeeWhId = currentUser?.warehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0)

        // Bodega destino: para empleados siempre es su bodega; para admin es la del borrador o la activa
        const destId = isEmployee
            ? employeeWhId
            : (draft.destWarehouseId || (activeWarehouseId && Number(activeWarehouseId) !== originId ? Number(activeWarehouseId) : 0))

        if (isEmployee && destId > 0 && originId === destId) {
            toast.info(`Este repuesto ya se encuentra en tu bodega (${whName}).`)
            return
        }

        dispatch(
            addTransferDraftLine({
                destWarehouseId: destId > 0 ? destId : undefined,
                line: {
                    productId: Number(product.id),
                    code: product.code,
                    description: product.name,
                    originWarehouseId: originId,
                    originWarehouseName: whName,
                    quantity: 1,
                    max: availableQty,
                },
            })
        )

        dispatch(
            openDrawerForm({
                kind: 'createTransfer',
            })
        )

        toast.success(`"${product.name}" agregado a la solicitud de traslado (${whName})`)
    }

    const items = hasWarehouseList
        ? warehouses.map((wh, idx) => ({
            id: wh.id,
            name: wh.name,
            code: formatWarehouseCode(wh.code, idx),
            qty: product.stockByWarehouse?.[wh.id] ?? 0,
        }))
        : stockEntries.map(([whId, qty], idx) => ({
            id: whId,
            name: `Bodega #${whId}`,
            code: `B-${String(idx + 1).padStart(2, '0')}`,
            qty,
        }))

    return (
        <div className="product-card-warehouse-stock" aria-label="Existencias por bodega">
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className={`warehouse-stock-badge ${item.qty <= 0 ? 'is-empty' : ''}`}
                    title={`${item.name}: ${item.qty} disponibles. Clic para solicitar traslado.`}
                    onClick={(e) => handleBadgeClick(e, item.id, item.name, item.qty)}
                >
                    <span className="warehouse-badge-code">{item.code}</span>
                    <span className="warehouse-badge-qty">{item.qty}</span>
                </button>
            ))}
        </div>
    )
}

export default ProductCardWarehouseStock
