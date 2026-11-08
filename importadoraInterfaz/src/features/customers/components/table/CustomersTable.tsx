// CustomersTable · tabla de clientes: listado integral con badges de background, dropdown de estado y acciones CRUD
import React, { useState } from 'react'
import './CustomersTable.css'
import '@/features/inventory/components/InventoryTables.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import type { Customer } from '../../types/customers.types'
import { selectCustomer } from '../../slices/customers.slice'
import { useDocumentAlerts } from '../../hooks/useDocumentAlerts'
import { deleteCustomerThunk, loadCustomersThunk, updateCustomerThunk } from '../../thunks/customers.thunks'
import {
  selectCustomersError,
  selectCustomersStatus,
  selectOpenCustomerId,
  selectVisibleCustomers,
} from '../../selectors/customers.selectors'
import { RowActions, type RowAction } from '@/global/components/UI/molecules/table/RowActions'
import { ConfirmDialog } from '@/global/components/UI/molecules/dialogs/ConfirmDialog'
import { openDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'

const COLUMNS = 6

export const CustomersTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const customers = useAppSelector(selectVisibleCustomers)
  const status = useAppSelector(selectCustomersStatus)
  const error = useAppSelector(selectCustomersError)
  const openId = useAppSelector(selectOpenCustomerId)
  const docAlerts = useDocumentAlerts()

  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const empty =
    status === 'loading'
      ? 'Cargando clientes…'
      : status === 'failed'
      ? error || 'No se pudieron cargar los clientes.'
      : customers.length === 0
      ? 'No hay clientes que coincidan con la búsqueda.'
      : null

  const handleToggleStatus = async (customer: Customer, nextStatusStr: string) => {
    try {
      await dispatch(updateCustomerThunk({ id: customer.id, body: { status: nextStatusStr } })).unwrap()
      toast.success(`Estado de ${customer.fullName} actualizado a ${nextStatusStr === 'active' ? 'Activo' : 'Inactivo'}.`)
      dispatch(loadCustomersThunk())
    } catch {
      toast.error('No se pudo actualizar el estado del cliente.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!customerToDelete || deleteReason.trim().length < 10 || deleteReason.trim().length > 100) return
    setIsDeleting(true)
    try {
      await dispatch(deleteCustomerThunk({ customerId: customerToDelete.id, reason: deleteReason.trim() })).unwrap()
      toast.success(`Cliente ${customerToDelete.fullName} eliminado correctamente.`)
      setCustomerToDelete(null)
      setDeleteReason('')
      dispatch(loadCustomersThunk())
    } catch {
      toast.error('No se pudo eliminar el cliente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const getRowActions = (customer: Customer): RowAction[] => [
    {
      key: 'detail',
      label: 'Ver detalle',
      icon: eyeIcon,
      onClick: () => dispatch(selectCustomer(customer.id)),
    },
    {
      key: 'edit',
      label: 'Editar',
      icon: editIcon,
      onClick: () => dispatch(openDrawerForm({ kind: 'editCustomer', payload: customer.id })),
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: trashIcon,
      tone: 'danger',
      onClick: () => {
        setCustomerToDelete(customer)
        setDeleteReason('')
      },
    },
  ]

  return (
    <div className="customers-table-card">
      <div className="customers-table-responsive table-scroll">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="table-cell-center">Documento</th>
              <th>Correo</th>
              <th className="table-cell-center">Tipo</th>
              <th className="table-cell-center">Estado</th>
              <th className="table-cell-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={COLUMNS} className="customers-table-empty">
                  <p>{empty}</p>
                  {status === 'failed' && (
                    <button type="button" className="btn-secondary" onClick={() => dispatch(loadCustomersThunk())}>
                      Reintentar
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              customers.map((customer: Customer) => (
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
                      <div className="customers-table-person-text">
                        <strong className="customers-table-name">{customer.fullName}</strong>
                        {customer.businessName && <span className="customers-table-business">{customer.businessName}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell-center">
                    <span className="table-badge-bg is-document">
                      {customer.identification || '—'}
                    </span>
                    {docAlerts[customer.id] === 'expired' && (
                      <span className="badge-doc-alert is-expired" title="Documentos legales vencidos">
                        ⚠️ Vencido
                      </span>
                    )}
                    {docAlerts[customer.id] === 'expiring' && (
                      <span className="badge-doc-alert is-expiring" title="Documentos legales próximos a vencer">
                        ⏱ Por vencer
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="table-cell-muted">{customer.email || '—'}</span>
                  </td>
                  <td className="table-cell-center">
                    <span className="table-badge-bg is-pill">
                      {customer.userType || 'Natural'}
                    </span>
                  </td>
                  <td className="table-cell-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`inv-status-select ${customer.isActive ? 'is-active' : 'is-inactive'}`}
                      value={customer.isActive ? 'active' : 'inactive'}
                      onChange={(e) => handleToggleStatus(customer, e.target.value)}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                  <td className="table-cell-center" onClick={(e) => e.stopPropagation()}>
                    <RowActions actions={getRowActions(customer)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(customerToDelete)}
        title="Eliminar cliente"
        message={`¿Estás seguro de eliminar a "${customerToDelete?.fullName}"? Esta acción lo enviará a la papelera.`}
        confirmLabel={isDeleting ? 'Eliminando…' : 'Eliminar'}
        confirmDisabled={deleteReason.trim().length < 10 || deleteReason.trim().length > 100 || isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setCustomerToDelete(null)
          setDeleteReason('')
        }}
      >
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--c-slate-700)' }}>
            Motivo de eliminación *
          </label>
          <textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Indica el motivo (10 a 100 caracteres)..."
            rows={3}
            maxLength={100}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--c-slate-300)',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <small>{deleteReason.trim().length}/100 (mínimo 10)</small>
        </div>
      </ConfirmDialog>
    </div>
  )
}

export default CustomersTable
