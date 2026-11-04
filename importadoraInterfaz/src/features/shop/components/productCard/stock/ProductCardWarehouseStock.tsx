// ProductCardWarehouseStock · indicador consolidado de stock total en red sobre la tarjeta de producto
// conecta con: ProductCardMedia; lee bodegas de warehouses.selectors; al hacer clic abre el drawer de traslados con el desglose por bodega
import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { fetchWarehousesThunk } from '@/features/warehouses'
import { openDrawerForm } from '@/features/navigation'
import type { Product } from '../../../types/shop.types'
import './ProductCardWarehouseStock.css'

interface ProductCardWarehouseStockProps {
    product: Product
}

export const ProductCardWarehouseStock: React.FC<ProductCardWarehouseStockProps> = ({ product }) => {
    const dispatch = useAppDispatch()
    const status = useAppSelector((state) => state.warehouses.status)
    const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
    const currentUser = useAppSelector((state) => state.auth.user)
    const draftDestWarehouseId = useAppSelector((state) => state.transfers.draft.destWarehouseId)

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchWarehousesThunk())
        }
    }, [dispatch, status])

    // Suma consolidada total de todas las bodegas
    const totalConsolidated = Object.values(product.stockByWarehouse ?? {}).reduce(
        (acc, qty) => acc + (Number(qty) > 0 ? Number(qty) : 0),
        0
    )

    const isEmployee = currentUser?.userType?.toLowerCase() === 'employee'
    const employeeWhId = currentUser?.warehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0)

    const destId = isEmployee
        ? employeeWhId
        : (draftDestWarehouseId || (activeWarehouseId ? Number(activeWarehouseId) : 0))

const handleConsolidatedClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    dispatch(
        openDrawerForm({
            kind: 'createTransfer',
            payload: {
                product: {
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    stockByWarehouse: product.stockByWarehouse,
                    imageUrl: product.imageUrl,
                },
                destinationWarehouseId: destId > 0 ? destId : undefined,
            },
        })
    )
}

return (
    <div className="product-card-warehouse-stock" aria-label="Consolidado de existencias en red">
        <button
            type="button"
            className={`warehouse-stock-consolidated-btn ${totalConsolidated <= 0 ? 'is-empty' : ''}`}
            title={`Total en red: ${totalConsolidated} unidades. Clic para ver disponibilidad por sede y solicitar traslado.`}
            onClick={handleConsolidatedClick}
        >
            <span className="consolidated-qty">{totalConsolidated}</span>
        </button>
    </div>
)
}

export default ProductCardWarehouseStock
