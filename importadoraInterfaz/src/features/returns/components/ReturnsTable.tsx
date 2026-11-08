// ReturnsTable · tabla paginada de devoluciones con sus estados de carga y vacío
// conecta con: ReturnsScreen; usa ReturnRow, Pagination y usePagedList (global)
import React from 'react'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import type { ReturnDto } from '../types/returns.types'
import { ReturnRow } from './ReturnRow'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface Props {
  rows: ReturnDto[]
  loading: boolean
  resetKey: string // al cambiar (filtros) la tabla vuelve a la página 1
  onApprove: (ret: ReturnDto) => void
  onReject: (ret: ReturnDto) => void
}

const COLUMNS = ['Caso #', 'Venta / Factura', 'Bodega Origen', 'Fecha', 'Cliente', 'Motivo Declarado', 'Resolución Aplicada', 'Monto Total', 'Estado']

export const ReturnsTable: React.FC<Props> = ({ rows, loading, resetKey, onApprove, onReject }) => {
  const { pageItems, meta, setPage } = usePagedList(rows, resetKey)
  const message = loading ? 'Cargando devoluciones y garantías...' : rows.length === 0 ? 'No se encontraron registros de devolución con los filtros aplicados.' : ''
  return (
    <>
      <DataTable tableId="returns-returns" className="returns-table">
          <thead>
            <tr>
              {COLUMNS.map((name) => <th key={name}>{name}</th>)}
              <th className="returns-th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr><td colSpan={COLUMNS.length + 1} className="returns-empty">{message}</td></tr>
            ) : (
              pageItems.map((ret) => <ReturnRow key={ret.id} ret={ret} onApprove={onApprove} onReject={onReject} />)
            )}
          </tbody>
        </DataTable>
      <Pagination meta={meta} label="Paginación de devoluciones" onPageChange={setPage} />
    </>
  )
}
