// CustomersTable · tabla de clientes: una fila por cliente (avatar con iniciales, nombre, documento, contacto y tipo); al hacer clic abre su panel
// conecta con: customers.selectors (lista visible, estado y cliente abierto), customers.slice (selectCustomer) y global format (iniciales); la pinta CustomersScreen
// ojo: carga, error y lista vacía se muestran dentro de la misma tabla para que no salte el diseño
import React from 'react'
import './CustomersTable.css'
import { getInitials } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCustomer } from '../../slices/customers.slice'
import { loadCustomersThunk } from '../../thunks/customers.thunks'
import {
  selectCustomersError,
  selectCustomersStatus,
  selectOpenCustomerId,
  selectVisibleCustomers,
} from '../../selectors/customers.selectors'

const COLUMNS = 4

export const CustomersTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const customers = useAppSelector(selectVisibleCustomers)
  const status = useAppSelector(selectCustomersStatus)
  const error = useAppSelector(selectCustomersError)
  const openId = useAppSelector(selectOpenCustomerId)

  const message = (() => {
    if (status === 'failed') return error
    if (customers.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando clientes…'
    if (customers.length === 0) return 'No se encontraron clientes.'
    return null
  })()

  return (
    <div className="customers-table-responsive">
      <table className="customers-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Documento</th>
            <th>Contacto</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={COLUMNS} className="customers-table-message">
                <p className="customers-table-message-text">{message}</p>
                {status === 'failed' && (
                  <button type="button" className="customers-table-retry" onClick={() => dispatch(loadCustomersThunk())}>
                    Reintentar
                  </button>
                )}
              </td>
            </tr>
          ) : (
            customers.map((customer) => (
              <tr
                key={customer.id}
                className={`customers-table-row ${openId === customer.id ? 'customers-table-row-selected' : ''}`}
                onClick={() => dispatch(selectCustomer(customer.id))}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') dispatch(selectCustomer(customer.id))
                }}
                aria-selected={openId === customer.id}
              >
                <td>
                  <div className="customers-table-person">
                    <span className="customers-table-avatar" aria-hidden="true">
                      {getInitials(customer.fullName)}
                    </span>
                    <div className="customers-table-person-text">
                      <span className="customers-table-name">{customer.fullName}</span>
                      {customer.businessName && <span className="customers-table-business">{customer.businessName}</span>}
                    </div>
                  </div>
                </td>
                <td>{customer.identification || '—'}</td>
                <td>{customer.email || '—'}</td>
                <td>
                  <span className="customers-table-type">{customer.userType || '—'}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CustomersTable
