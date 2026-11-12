// people.entries · entradas del registro de formularios del panel derecho de personas: perfil propio, clientes, empleados, roles, permisos y administradores superadmin
import { createElement } from 'react'
import { CreateCustomerForm, EditCustomerForm } from '@/features/customers'
import { ExternalFormPanel, type ExternalFormPayload } from '@/features/externals'
import { EmployeeDetailPanel, EmployeePermissionsPanel, PermissionsHubPanel, HUB_TITLES, RoleForm, CreateEmployeePanel, type HubView, type EmployeePermissionsMode, type EmployeeRole, type SimpleEmployee } from '@/features/employees'
import { AdminFormDrawer, type AdminFormPayload } from '@/features/superadmin'
import { UserProfilePanel } from '@/features/auth'
import userIcon from '@/assets/icons/user.svg'
import type { DrawerFormKind } from '@/features/navigation'
import type { FormEntry } from './formEntry.types'

interface EmployeePermissionsPayload {
  employee: SimpleEmployee
  mode: EmployeePermissionsMode
}

export const PEOPLE_ENTRIES: Partial<Record<DrawerFormKind, FormEntry>> = {
  userProfile: {
    icon: userIcon,
    title: () => 'Perfil de usuario',
    subtitle: 'Datos de tu cuenta y permisos activos',
    render: () => createElement(UserProfilePanel),
  },
  createEmployee: {
    permission: ['employees:create'],
    icon: userIcon,
    title: () => 'Registrar Nuevo Empleado',
    subtitle: 'Crea credenciales de acceso y asigna sede y rol',
    render: () => createElement(CreateEmployeePanel),
  },
  createCustomer: {
    permission: ['customers:create'],
    icon: userIcon,
    title: () => 'Nuevo Cliente',
    subtitle: 'Registra un cliente en la compañía',
    render: () => createElement(CreateCustomerForm),
  },
  editCustomer: {
    permission: ['customers:edit'],
    icon: userIcon,
    title: () => 'Editar Cliente',
    subtitle: 'Información general, contacto y datos fiscales',
    render: (payload) => createElement(EditCustomerForm, { key: String(payload), customerId: Number(payload) }),
  },
  externalForm: {
    permission: ['suppliers:create', 'suppliers:edit'],
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
    permission: ['roles:view'],
    icon: userIcon,
    title: (payload) => HUB_TITLES[payload as HubView],
    subtitle: 'Roles, permisos y empleados',
    wide: true,
    render: (payload) => createElement(PermissionsHubPanel, { key: String(payload), view: payload as HubView }),
  },
  roleForm: {
    permission: ['roles:create', 'roles:edit'],
    icon: userIcon,
    title: (payload) => (payload ? 'Editar rol' : 'Nuevo rol'),
    subtitle: 'Nombre, descripción y estado',
    render: (payload) => createElement(RoleForm, { key: String((payload as EmployeeRole | null)?.roleId ?? 'new'), role: payload as EmployeeRole | null }),
  },
  employeeDetail: {
    permission: ['employees:view_detail'],
    icon: userIcon,
    title: () => 'Detalle del empleado',
    subtitle: 'Datos y permisos',
    render: (payload) => createElement(EmployeeDetailPanel, { key: String((payload as SimpleEmployee).employeeId), employee: payload as SimpleEmployee }),
  },
  employeePermissions: {
    permission: ['roles:view', 'employees:view_detail'],
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
