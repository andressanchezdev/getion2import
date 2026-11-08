// menuItems · lista fija del menú lateral (módulos y subgestiones)
// conecta con: SideMenu (lo pinta), navigation.slice (elige el primer subitem), MainContent (decide la pantalla)
import type { ERPModule, NavItem } from '../types/navigation.types'
import storeIcon from '@/assets/icons/store.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import packageIcon from '@/assets/icons/package-alt-2-svgrepo-com.svg'
import databaseIcon from '@/assets/icons/database.svg'
import userIcon from '@/assets/icons/user.svg'
import fileTextIcon from '@/assets/icons/file-text.svg'
import shoppingBagIcon from '@/assets/icons/shopping-bag.svg'
import settingsIcon from '@/assets/icons/settings.svg'

export const MENU_ITEMS: NavItem[] = [
    {
        id: 'shop',
        label: 'Tienda',
        icon: storeIcon,
        subitems: [
            { id: 'catalog', label: 'Catálogo' },
            { id: 'quotations', label: 'Cotizaciones' },
            { id: 'orders', label: 'Pedidos Activos' },
            { id: 'transfers', label: 'Traslados' },
            { id: 'receiving', label: 'Recepción de Compra' },
            { id: 'cashRegister', label: 'Caja' },
            { id: 'generalReport', label: 'Reporte General' },
        ],
    },
    {
        id: 'cashRegister',
        label: 'Gestión Ventas',
        icon: packageIcon,
        subitems: [
            { id: 'billingHistory', label: 'Historial de Ventas' },
            { id: 'invoices', label: 'Facturas' },
            { id: 'purchaseOrders', label: 'Órdenes de Compra' },
            { id: 'returns', label: 'Devolución & Garantía' },
        ],
    },
    {
        id: 'inventory',
        label: 'Gestión Inventario',
        icon: databaseIcon,
        subitems: [
            { id: 'warehouses', label: 'Bodegas' },
            { id: 'products', label: 'Productos' },
            { id: 'counts', label: 'Conteos Físicos' },
            { id: 'brands', label: 'Marcas' },
            { id: 'categories', label: 'Categorías' },
            { id: 'models', label: 'Modelos' },
        ],
    },
    {
        id: 'wallet',
        label: 'Cartera',
        icon: walletIcon,
        subitems: [
            { id: 'creditClients', label: 'Créditos' },
            { id: 'paymentVerification', label: 'Abonos' },
            { id: 'bankReconciliation', label: 'Conciliación Entradas' },
        ],
    },
    {
        id: 'thirdParties',
        label: 'Terceros & Roles',
        icon: userIcon,
        subitems: [
            { id: 'customers', label: 'Clientes' },
            { id: 'employees', label: 'Empleados' },
            { id: 'suppliers', label: 'Proveedores' },
            { id: 'carriers', label: 'Transportadoras' },
        ],
    },
    {
        id: 'reports',
        label: 'Reportes & Auditoría',
        icon: fileTextIcon,
        subitems: [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'general', label: 'Reporte General' },
            { id: 'recycleBin', label: 'Papelera de Reciclaje' },
            { id: 'audit', label: 'Auditoría de Movimientos' },
        ],
    },
    {
        id: 'settings',
        label: 'Configuración',
        icon: settingsIcon,
        subitems: [
            { id: 'company', label: 'Empresa' },
            { id: 'billing', label: 'Facturación' },
            { id: 'rolesPermissions', label: 'Roles y permisos' },
        ],
    },
    {
        id: 'superadmin',
        label: 'Gestión Superadmin',
        icon: databaseIcon,
        subitems: [
            { id: 'admins', label: 'Administradores' },
            { id: 'backups', label: 'Respaldos' },
        ],
    },
]

// Título de la cabecera por módulo
export const MODULE_HEADER_TITLES: Record<ERPModule, string> = {
    shop: 'Tienda',
    sales: 'Gestión Ventas',
    cashRegister: 'Gestión Ventas',
    purchases: 'Gestión Compras',
    inventory: 'Gestión Inventario',
    transfers: 'Traslados',
    wallet: 'Cartera',
    thirdParties: 'Terceros',
    reports: 'Auditoría',
    settings: 'Configuración',
    superadmin: 'Gestión Superadmin',
}

// Ícono del encabezado por módulo
export const MODULE_HEADER_ICONS: Record<ERPModule, string> = {
    shop: storeIcon,
    sales: packageIcon,
    cashRegister: packageIcon,
    purchases: shoppingBagIcon,
    inventory: databaseIcon,
    transfers: fileTextIcon,
    wallet: walletIcon,
    thirdParties: userIcon,
    reports: fileTextIcon,
    settings: settingsIcon,
    superadmin: databaseIcon,
}
