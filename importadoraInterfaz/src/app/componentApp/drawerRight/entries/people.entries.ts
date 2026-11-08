// people.entries · entradas del registro de formularios del panel derecho de personas: clientes, empleados, roles, permisos y administradores superadmin
import { createElement } from 'react'
import { CreateCustomerForm, EditCustomerForm } from '@/features/customers'
import { ExternalFormPanel, type ExternalFormPayload } from '@/features/externals'
import { EmployeeDetailPanel, EmployeePermissionsPanel, PermissionsHubPanel, HUB_TITLES, RoleForm, type HubView, type EmployeePermissionsMode, type EmployeeRole, type SimpleEmployee } from '@/features/employees'
import { AdminFormDrawer, type AdminFormPayload } from '@/features/superadmin'
import userIcon from '@/assets/icons/user.svg'
import type { DrawerFormKind } from '@/features/navigation'
import type { FormEntry } from './formEntry.types'

interface EmployeePermissionsPayload {
  employee: SimpleEmployee
  mode: EmployeePermissionsMode
}

export const PEOPLE_ENTRIES: Partial<Record<DrawerFormKind, FormEntry>> = {
  createCustomer: {
    icon: userIcon,
    title: () => 'Nuevo Cliente',
    subtitle: 'Registra un cliente en la compañía',
    render: () => createElement(CreateCustomerForm),
  },
  editCustomer: {
    icon: userIcon,
    title: () => 'Editar Cliente',
    subtitle: 'Nombre, teléfono y correo',
    render: (payload) => createElement(EditCustomerForm, { key: String(payload), customerId: Number(payload) }),
  },
  externalForm: {
    icon: userIcon,
    title: (payload) => {
      const { kind, item } = payload as ExternalFormPayload
      return `${item ? 'Editar' : 'Registrar'} ${kind === 'carrier' ? 'transportadora' : 'proveedor'}`
    },
    subtitle: 'Datos, contacto y condiciones',
    render: (payload) => {
      const form = payload as ExternalFormPayload
      return createElement(ExternalFormPanel, { key: `${form.kind}-${form.item?.id ?? 'new'}`, payload: form })
    },
  },
  permissionsHub: {
    icon: userIcon,
    title: (payload) => HUB_TITLES[payload as HubView],
    subtitle: 'Roles, permisos y empleados',
    wide: true,
    render: (payload) => createElement(PermissionsHubPanel, { key: String(payload), view: payload as HubView }),
  },
  roleForm: {
    icon: userIcon,
    title: (payload) => (payload ? 'Editar rol' : 'Nuevo rol'),
    subtitle: 'Nombre, descripción y estado',
    render: (payload) => createElement(RoleForm, { key: String((payload as EmployeeRole | null)?.roleId ?? 'new'), role: payload as EmployeeRole | null }),
  },
  employeeDetail: {
    icon: userIcon,
    title: () => 'Detalle del empleado',
    subtitle: 'Datos y permisos',
    render: (payload) => createElement(EmployeeDetailPanel, { key: String((payload as SimpleEmployee).employeeId), employee: payload as SimpleEmployee }),
  },
  employeePermissions: {
    icon: userIcon,
    title: (payload) => `${(payload as EmployeePermissionsPayload).mode === 'edit' ? 'Editar' : 'Ver'} permisos`,
    subtitle: 'Pantallas y acciones del empleado',
    render: (payload) => {
      const { employee, mode } = payload as EmployeePermissionsPayload
      return createElement(EmployeePermissionsPanel, { key: `${employee.employeeId}-${mode}`, employee, mode })
    },
  },
  adminForm: {
    icon: userIcon,
    title: (payload) => ((payload as AdminFormPayload)?.admin ? 'Editar Administrador' : 'Nuevo Administrador'),
    subtitle: 'Cuenta de acceso y asignación empresarial',
    render: (payload) => createElement(AdminFormDrawer, { payload: payload as AdminFormPayload }),
  },
}
