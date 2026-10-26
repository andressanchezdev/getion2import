// TableMessageRow · fila única de una tabla para mostrar "cargando", "sin resultados" o un error con botón "Reintentar"
// conecta con: DataTable.css (estilos compartidos de tablas); la usan SalesHistoryScreen, PendingCartsScreen, SuppliersScreen y ProductControlScreen
// ojo: el botón solo aparece si se pasa onRetry (es decir, cuando la carga falló); el mensaje de error se anuncia con role="alert"
import React from 'react'
import './DataTable.css'

interface TableMessageRowProps {
  colSpan: number
  message: string
  isError?: boolean
  onRetry?: () => void
}

export const TableMessageRow: React.FC<TableMessageRowProps> = ({ colSpan, message, isError = false, onRetry }) => (
  <tr>
    <td colSpan={colSpan} className="data-table-message">
      <p className="data-table-message-text" role={isError ? 'alert' : undefined}>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="data-table-retry" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </td>
  </tr>
)

export default TableMessageRow
