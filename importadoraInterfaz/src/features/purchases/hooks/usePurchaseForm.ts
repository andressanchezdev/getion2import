// usePurchaseForm · formulario de una orden de compra nueva: proveedor, referencia, fecha esperada, notas y los productos con su cantidad, costo e IVA
// conecta con: PurchaseFormPanel (lo usa), purchases.rules (totales y validación), purchases.thunks (proveedores y crear), inventory (searchCatalogThunk: buscar productos del catálogo) y navigation (bodega activa y cierra el panel)
// ojo: la orden es de la bodega activa; el costo y la cantidad son obligatorios por producto; un mismo producto no se agrega dos veces
import { useEffect, useMemo, useState } from 'react'
import { searchCatalogThunk } from '@/features/inventory'
import { closeDrawerForm } from '@/features/navigation'
import type { Product } from '@/features/shop'
import { toast } from '@/global/helpers/feedback/toast'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { IVA_DEFAULT } from '../constants/purchases.constants'
import { draftProblem, draftTotals, type DraftLine } from '../helpers/purchases.rules'
import { selectPurchasesSaving, selectSuppliers } from '../selectors/purchases.selectors'
import { createPurchaseThunk, loadSuppliersThunk } from '../thunks/purchases.thunks'

export const usePurchaseForm = () => {
  const dispatch = useAppDispatch()
  const warehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const suppliers = useAppSelector(selectSuppliers)
  const saving = useAppSelector(selectPurchasesSaving)
  const [supplierId, setSupplierId] = useState(0)
  const [supplierRef, setSupplierRef] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [text, setText] = useState('')
  const [found, setFound] = useState<{ query: string; items: Product[] }>({ query: '', items: [] })
  const [error, setError] = useState<string | null>(null)
  const query = useDebouncedValue(text, 350)
  const needle = query.trim()
  const canSearch = needle.length >= 2

  useEffect(() => {
    dispatch(loadSuppliersThunk())
  }, [dispatch])

  useEffect(() => {
    if (!canSearch) return
    let current = true
    dispatch(searchCatalogThunk(needle))
      .unwrap()
      .then((items) => current && setFound({ query: needle, items }))
      .catch(() => current && setFound({ query: needle, items: [] }))
    return () => {
      current = false
    }
  }, [dispatch, needle, canSearch])

  const results = canSearch && found.query === needle ? found.items.filter((product) => !lines.some((line) => line.productId === Number(product.id))) : []
  const totals = useMemo(() => draftTotals(lines), [lines])
  const problem = draftProblem(supplierId, lines)

  const addProduct = (product: Product) => {
    setLines((prev) => [...prev, { productId: Number(product.id), productCode: product.code, productName: product.name, quantity: 1, unitCost: 0, ivaPercent: IVA_DEFAULT }])
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
    searching: canSearch && found.query !== needle,
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
