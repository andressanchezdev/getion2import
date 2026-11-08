// quotationDraft.slice · la cotización que se está armando en «Cotizar»: renglones con su cantidad y precio, separada del carrito de ventas
// conecta con: QuotationCatalogScreen y QuotationDraftPanel (la llenan y la leen), quotationDraft.selectors y rootReducer (clave 'quotationDraft'; NO se guarda en el navegador)
// ojo: es independiente del carrito del backend: armar una cotización no toca el carrito de ventas; se vacía al crear la cotización o al cerrar sesión
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import type { QuotationDraftLine } from '../types/quotations.types'

interface QuotationDraftState {
  lines: QuotationDraftLine[]
}

const initialState: QuotationDraftState = { lines: [] }

export const quotationDraftSlice = createSlice({
  name: 'quotationDraft',
  initialState,
  reducers: {
    // agrega un renglón; si el producto ya estaba suma la cantidad y deja el precio del nivel más reciente
    addDraftLine: (state, action: PayloadAction<QuotationDraftLine>) => {
      const existing = state.lines.find((line) => line.productId === action.payload.productId)
      if (existing) {
        existing.quantity += action.payload.quantity
        existing.unitPrice = action.payload.unitPrice
      } else {
        state.lines.push(action.payload)
      }
    },
    setDraftQuantity: (state, action: PayloadAction<{ productId: number; quantity: number }>) => {
      const line = state.lines.find((item) => item.productId === action.payload.productId)
      if (line) line.quantity = Math.max(1, Math.floor(action.payload.quantity) || 1)
    },
    removeDraftLine: (state, action: PayloadAction<number>) => {
      state.lines = state.lines.filter((line) => line.productId !== action.payload)
    },
    clearDraft: (state) => {
      state.lines = []
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logoutThunk.fulfilled, () => initialState)
  },
})

export const { addDraftLine, setDraftQuantity, removeDraftLine, clearDraft } = quotationDraftSlice.actions
export const quotationDraftReducer = quotationDraftSlice.reducer
