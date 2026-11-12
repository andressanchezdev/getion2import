// ActionsHeader · encabezado estándar para la columna de acciones en todas las tablas
import React from 'react'

interface ActionsHeaderProps {
  className?: string
}

export const ActionsHeader: React.FC<ActionsHeaderProps> = ({ className = 'table-th-actions' }) => (
  <th className={className} data-align="center">
    Acciones
  </th>
)

export default ActionsHeader

