// CustomersScreen · pantalla de Terceros > Clientes: búsqueda, tabla de clientes del backend y paginador
// ojo: «Nuevo Cliente» abre el formulario en el panel derecho (CreateCustomerForm, por formRegistry), no una ventana flotante
// conecta con: customers.slice/selectors (lista y búsqueda), useCustomersLoader (la pide), CustomersTable y global SearchBar y Pagination; la monta MainContent (screenRegistry); al elegir un cliente se abre CustomerDrawer en el panel derecho
// ojo: la búsqueda se aplica sobre la página cargada (el listado del backend solo filtra por empresa y página)
import './CustomersScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import { CustomersTable } from '../components/table/CustomersTable'
import { useCustomersLoader } from '../hooks/useCustomersLoader'
import { selectCustomersMeta, selectCustomersQuery, selectCustomersStatus } from '../selectors/customers.selectors'
import { setCustomersPage, setCustomersQuery } from '../slices/customers.slice'

export const CustomersScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  useCustomersLoader()
  const { canPerformAction } = usePermissions()
  const canCreate = canPerformAction('thirdParties', 'customers', 'create')

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
              onClick={() => dispatch(openDrawerForm({ kind: 'createCustomer' }))}
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
    </div>
  )
}


export default CustomersScreen