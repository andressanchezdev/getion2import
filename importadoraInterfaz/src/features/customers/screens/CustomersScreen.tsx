// CustomersScreen · pantalla de Terceros > Clientes: búsqueda, tabla de clientes del backend y paginador
// conecta con: customers.slice/selectors (lista y búsqueda), useCustomersLoader (la pide), CustomersTable y global SearchBar y Pagination; la monta MainContent (screenRegistry); al elegir un cliente se abre CustomerDrawer en el panel derecho
// ojo: la búsqueda se aplica sobre la página cargada (el listado del backend solo filtra por empresa y página)
import { useState } from 'react'
import './CustomersScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { usePermissions } from '@/global/hooks/usePermissions'
import { CustomersTable } from '../components/table/CustomersTable'
import { CreateCustomerModal } from '../components/modal/CreateCustomerModal'
import { useCustomersLoader } from '../hooks/useCustomersLoader'
import { selectCustomersMeta, selectCustomersQuery, selectCustomersStatus } from '../selectors/customers.selectors'
import { setCustomersPage, setCustomersQuery } from '../slices/customers.slice'
import { loadCustomersThunk } from '../thunks/customers.thunks'

export const CustomersScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  useCustomersLoader()
  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('thirdParties', 'customers', 'create')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const query = useAppSelector(selectCustomersQuery)
  const meta = useAppSelector(selectCustomersMeta)
  const status = useAppSelector(selectCustomersStatus)

  return (
    <div className="customers-screen">
      <div className="customers-screen-card">
        <div className="customers-screen-toolbar">
          <SearchBar
            value={query}
            onChange={(value) => dispatch(setCustomersQuery(value))}
            placeholder="Buscar por nombre, documento, correo o razón social..."
            className="customers-screen-search"
          />
          {canCreate && (
            <button
              type="button"
              className="btn-primary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => setIsCreateOpen(true)}
            >
              + Nuevo Cliente
            </button>
          )}
        </div>
        <CustomersTable />
      </div>
      {meta && (
        <Pagination
          meta={meta}
          disabled={status === 'loading'}
          label="Paginación de clientes"
          onPageChange={(page) => dispatch(setCustomersPage(page))}
        />
      )}

      <CreateCustomerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          dispatch(loadCustomersThunk())
        }}
      />
    </div>
  )
}


export default CustomersScreen