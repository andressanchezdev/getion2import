// DataTable · contenedor único de las tablas del ERP: scroll con encabezado fijo, diseño común (data-table) ancho de columnas ajustable y recordado, y un botón de recarga que aparece cuando se movió y devuelve la distribución original
// conecta con: styles/data-table.css (diseño), useColumnResize (arrastrar el borde de cada encabezado) y columnWidths (guarda por tabla y usuario); lo usan todas las pantallas con tabla
// ojo: cada pantalla pasa su <thead> y <tbody> como hijos y un tableId único y estable (ahí se recuerdan los anchos); sin tableId distinto dos tablas compartirían los mismos anchos
import React, { useRef } from 'react'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { useColumnResize } from '@/global/hooks/ui/useColumnResize'
import { columnWidthsKey } from '@/global/helpers/table/columnWidths'
import { Icon } from '@/global/components/UI/atoms/Icon'
import refreshIcon from '@/assets/icons/refresh.svg?raw'

interface DataTableProps {
  tableId: string
  className?: string
  children: React.ReactNode
}

export const DataTable: React.FC<DataTableProps> = ({ tableId, className = '', children }) => {
  const ref = useRef<HTMLTableElement>(null)
  const user = useAppSelector((state) => state.auth.user)
  const { isResized, reset } = useColumnResize(ref, columnWidthsKey(user ? `${user.userType}-${user.userId}` : undefined, tableId))

  return (
    <div className="data-table-wrap table-scroll">
      {isResized && (
        <button type="button" className="data-table-reset" onClick={reset} title="Restablecer la distribución original de las columnas" aria-label="Restablecer la distribución original de las columnas">
          <Icon svg={refreshIcon} size="sm" />
        </button>
      )}
      <table ref={ref} className={`data-table ${className}`.trim()}>
        {children}
      </table>
    </div>
  )
}

export default DataTable
