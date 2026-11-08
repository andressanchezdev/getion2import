// usePurchaseForm · formulario de una orden de compra nueva: proveedor, referencia, fecha esperada, notas y los productos con su cantidad, costo e IVA
// conecta con: PurchaseFormPanel (lo usa), purchases.rules (totales y validación), purchases.thunks (proveedores, su catálogo y crear) y navigation (bodega activa y cierra el panel)
// ojo: la orden es de la bodega activa; solo se ofrecen los productos del catálogo del proveedor (con su costo ya puesto); el costo y la cantidad son obligatorios por producto; un mismo producto no se agrega dos veces; al cambiar de proveedor se vacían los productos
import { useEffect, useMemo, useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { IVA_DEFAULT } from '../constants/purchases.constants'
import { draftProblem, draftTotals, type DraftLine } from '../helpers/purchases.rules'
import { selectPurchasesSaving, selectSuppliers } from '../selectors/purchases.selectors'
import { createPurchaseThunk, loadSupplierProductsThunk, loadSuppliersThunk } from '../thunks/purchases.thunks'
import type { SupplierProduct } from '../types/purchases.types'

export const usePurchaseForm = () => {
  const dispatch = useAppDispatch()
  const warehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const suppliers = useAppSelector(selectSuppliers)
  const saving = useAppSelector(selectPurchasesSaving)
  const [supplierId, setSupplierIdState] = useState(0)
  const [supplierRef, setSupplierRef] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [text, setText] = useState('')
  const [catalog, setCatalog] = useState<{ supplierId: number; items: SupplierProduct[] }>({ supplierId: 0, items: [] })
  const [error, setError] = useState<string | null>(null)
  const needle = text.trim().toLowerCase()

  useEffect(() => {
    dispatch(loadSuppliersThunk())
  }, [dispatch])

  // el catálogo del proveedor elegido (lo que de verdad nos vende)
  useEffect(() => {
    if (supplierId <= 0) return
    let current = true
    dispatch(loadSupplierProductsThunk(supplierId))
      .unwrap()
      .then((items) => current && setCatalog({ supplierId, items }))
      .catch(() => current && setCatalog({ supplierId, items: [] }))
    return () => {
      current = false
    }
  }, [dispatch, supplierId])

  const catalogReady = supplierId > 0 && catalog.supplierId === supplierId
  const results = catalogReady
    ? catalog.items
        .filter((product) => !lines.some((line) => line.productId === product.productId))
        .filter((product) => !needle || `${product.code} ${product.name} ${product.supplierCode}`.toLowerCase().includes(needle))
        .slice(0, 8)
    : []

  // cambiar de proveedor deja sin efecto los productos ya elegidos (podrían no ser de su catálogo)
  const setSupplierId = (id: number) => {
    if (id === supplierId) return
    if (lines.length > 0) {
      setLines([])
      toast.info('Cambiaste de proveedor: se vació la lista de productos.')
    }
    setText('')
    setSupplierIdState(id)
  }
  const totals = useMemo(() => draftTotals(lines), [lines])
  const problem = draftProblem(supplierId, lines)

  const addProduct = (product: SupplierProduct) => {
    setLines((prev) => [...prev, { productId: product.productId, productCode: product.code, productName: product.name, quantity: 1, unitCost: product.cost, ivaPercent: IVA_DEFAULT }])
    setText('')
  }
  const changeLine = (index: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (problem || saving || warehouseId <= 0) return
    setError(null)
    const result = await dispatch(
      createPurchaseThunk({
        supplierId,
        warehouseId,
        ...(supplierRef.trim() ? { supplierRef: supplierRef.trim() } : {}),
        ...(expectedDate ? { expectedDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitCost: line.unitCost, ivaPercent: line.ivaPercent })),
      })
    )
    if (createPurchaseThunk.fulfilled.match(result)) {
      toast.success(`Orden ${result.payload.serial} creada`)
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo crear la orden de compra.')
    }
  }

  return {
    warehouseName,
    suppliers,
    supplierId,
    setSupplierId,
    supplierRef,
    setSupplierRef,
    expectedDate,
    setExpectedDate,
    notes,
    setNotes,
    lines,
    text,
    setText,
    loadingCatalog: supplierId > 0 && !catalogReady,
    catalogEmpty: catalogReady && catalog.items.length === 0,
    results,
    addProduct,
    changeLine,
    removeLine,
    totals,
    problem: warehouseId <= 0 ? 'Elige una bodega' : problem,
    saving,
    error,
    submit,
    cancel: () => dispatch(closeDrawerForm()),
  }
}
