// menuItems · lista fija del menú lateral (módulos y subgestiones)
// conecta con: SideMenu (lo pinta), navigation.slice (elige el primer subitem), MainContent (decide la pantalla)
// ojo: id va en inglés (código) y label en español (lo que ve el cliente); antes los subitems eran solo texto
import type { ERPModule, NavItem } from '../types/navigation.types'
import storeIcon from '@/assets/icons/store.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import packageIcon from '@/assets/icons/package-alt-2-svgrepo-com.svg'
import databaseIcon from '@/assets/icons/database.svg'
import userIcon from '@/assets/icons/user.svg'
import fileTextIcon from '@/assets/icons/file-text.svg'
import settingsIcon from '@/assets/icons/settings.svg'

export const MENU_ITEMS: NavItem[] = [
    {
        id: 'shop',
        label: 'Tienda',
        icon: storeIcon,
        subitems: [
            { id: 'catalog', label: 'Catálogo POS' },
            { id: 'orders', label: 'Bandeja de Pedidos' },
            { id: 'history', label: 'Historial de Ventas' },
            { id: 'quotations', label: 'Cotizaciones' },
        ],
    },
    {
        id: 'cashRegister',
        label: 'Gestión Caja',
        icon: packageIcon,
        subitems: [
            { id: 'posBilling', label: 'Facturación Caja' },
            { id: 'billingHistory', label: 'Historial Facturación' },
            { id: 'shiftClose', label: 'Cierre de Turno' },
        ],
    },
    {
        id: 'wallet',
        label: 'Gestión Cartera',
        icon: walletIcon,
        subitems: [
            { id: 'creditClients', label: 'Gestión de Créditos' },
            { id: 'paymentVerification', label: 'Aprobación de Abonos' },
            { id: 'paymentHistory', label: 'Historial de Recaudos' },
        ],
    },
    {
        id: 'inventory',
        label: 'Gestión Inventario',
        icon: databaseIcon,
        subitems: [
            { id: 'products', label: 'Control de Productos' },
            { id: 'transfers', label: 'Traslados entre Bodegas' },
            { id: 'catalogs', label: 'Marcas y Categorías' },
            { id: 'movements', label: 'Auditoria' },
        ],
    },
    {
        id: 'thirdParties',
        label: 'Gestión Roles',
        icon: userIcon,
        subitems: [
            { id: 'customers', label: 'Clientes' },
            { id: 'suppliers', label: 'Proveedores' },
            { id: 'carriers', label: 'Transportadoras' },
            { id: 'employees', label: 'Empleados' },
            { id: 'rolesPermissions', label: 'Roles & Permisos' },
        ],
    },
    {
        id: 'reports',
        label: 'Reportes',
        icon: fileTextIcon,
        subitems: [
            { id: 'dailySales', label: 'Ventas Diarias' },
            { id: 'generalReport', label: 'Reporte General' },
            { id: 'inventoryReport', label: 'Valoración Inventario' },
        ],
    },
]

// título (lo que ve el cliente) que muestra MainContent arriba, por módulo
export const MODULE_HEADER_TITLES: Record<ERPModule, string> = {
    shop: 'Tienda',
    cashRegister: 'Gestión Caja',
    wallet: 'Gestión Cartera',
    inventory: 'Gestión Inventario',
    transfers: 'Traslados',
    thirdParties: 'Gestión Roles',
    reports: 'Reportes del Sistema',
    settings: 'Configuración del Sistema',
}

// ícono del encabezado de MainContent por módulo
export const MODULE_HEADER_ICONS: Record<ERPModule, string> = {
    shop: storeIcon,
    cashRegister: packageIcon,
    wallet: walletIcon,
    inventory: databaseIcon,
    transfers: fileTextIcon,
    thirdParties: userIcon,
    reports: fileTextIcon,
    settings: settingsIcon,
}
