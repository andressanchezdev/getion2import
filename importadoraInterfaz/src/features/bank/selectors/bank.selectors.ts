// bank.selectors · lecturas de la conciliación bancaria: lista con filtros, resumen, subida del PDF y pagos por verificar
// conecta con: BankReconciliationScreen y sus partes, y los hooks de bank; leen state.bank
import { createSelector } from '@reduxjs/toolkit'
import { summarizeRecords } from '../helpers/bank.adapter'
import type { BankState } from '../types/bank.types'

// forma mínima del state (así la feature no importa el store de app)
type BankRootState = { bank: BankState }

// lee la lista de movimientos con su estado de carga, página y filtros
export const selectBankList = (state: BankRootState) => state.bank.list
// lee cómo va la subida del PDF y lo que respondió
export const selectBankUpload = (state: BankRootState) => state.bank.upload
// lee los pagos por transferencia que siguen en revisión
export const selectPendingPayments = (state: BankRootState) => state.bank.pendingPayments
// dice si hay una confirmación o un «ignorar» en curso
export const selectBankSaving = (state: BankRootState) => state.bank.saving
// totales de las entradas de la página cargada
export const selectBankSummary = createSelector([(state: BankRootState) => state.bank.list.items], summarizeRecords)
