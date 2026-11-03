// BankReconciliationScreen · Cartera > Conciliación Entradas: se sube el PDF del banco, se leen sus movimientos y cartera confirma que cada entrada llegó, ligándola a un pago por transferencia
// conecta con: useBankRecords (lista y filtros), BankUploadButton, BankKpis, BankRecordsTable, global SearchBar (con su botón de limpiar integrado), FilterSelect y Pagination; la monta WalletScreen
// ojo: no hay datos de ejemplo: la pantalla arranca vacía y todo sale del PDF que entrega el banco; la tabla es paginada por el servidor (20 por página)
import React from 'react'
import './BankReconciliationScreen.css'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { BankRecordsTable } from '../components/table/BankRecordsTable'
import { BankKpis } from '../components/upload/BankKpis'
import { BankUploadButton } from '../components/upload/BankUploadButton'
import { BANK_STATUS_OPTIONS, INITIAL_BANK_FILTERS } from '../constants/bank.constants'
import { useBankRecords } from '../hooks/useBankRecords'
import type { BankRecordStatus } from '../types/bank.types'

export const BankReconciliationScreen: React.FC = () => {
  const bank = useBankRecords()
  const { filters } = bank
  const hasFilters = filters.status !== INITIAL_BANK_FILTERS.status || Boolean(filters.query || filters.from || filters.to)
  const message =
    bank.status === 'failed'
      ? bank.error
      : bank.items.length === 0
      ? bank.status === 'succeeded'
        ? hasFilters
          ? 'No hay movimientos con estos filtros.'
          : 'Todavía no hay movimientos: sube el PDF que entrega el banco para empezar.'
        : 'Cargando movimientos…'
      : null

  return (
    <div className="bank-screen">
      <BankKpis />
      <div className="bank-card">
        <div className="bank-filters">
          <SearchBar value={bank.text} onChange={bank.setText} hasActiveFilters={hasFilters} onClear={bank.clearFilters} placeholder="Buscar por descripción del movimiento..." className="bank-search" />
          <FilterSelect label="Estado" emptyValue="all" value={filters.status} options={BANK_STATUS_OPTIONS} onChange={(value) => bank.setFilter({ status: (value || 'all') as BankRecordStatus | 'all' })} />
          <input type="date" className="bank-date" aria-label="Desde" value={filters.from} onChange={(e) => bank.setFilter({ from: e.target.value })} />
          <input type="date" className="bank-date" aria-label="Hasta" value={filters.to} onChange={(e) => bank.setFilter({ to: e.target.value })} />
          <BankUploadButton />
        </div>
        <BankRecordsTable records={bank.items} message={message} />
        {bank.meta && <Pagination meta={bank.meta} disabled={bank.status === 'loading'} label="Paginación de movimientos del banco" onPageChange={bank.setPage} />}
      </div>
    </div>
  )
}

export default BankReconciliationScreen
