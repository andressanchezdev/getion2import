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
        label: 'Tienda & Cotización',
        icon: storeIcon,
        subitems: [
            { id: 'catalog', label: 'Catálogo de Repuestos' },
            { id: 'quotations', label: 'Cotizaciones' },
            { id: 'orders', label: 'Pedidos Activos' },
        ],
    },
    {
        id: 'cashRegister',
        label: 'Gestión Ventas',
        icon: packageIcon,
        subitems: [
            { id: 'posBilling', label: 'Facturación / POS' },
            { id: 'billingHistory', label: 'Historial de Ventas' },
            { id: 'returns', label: 'Devolución & Garantía' },
            { id: 'shiftClose', label: 'Cierre de Caja' },
        ],
    },
    {
        id: 'purchases',
        label: 'Gestión Compras',
        icon: shoppingBagIcon,
        subitems: [
            { id: 'purchaseOrders', label: 'Órdenes de Compra' },
            { id: 'receiving', label: 'Recepción en Bodega' },
            { id: 'suppliers', label: 'Proveedores' },
        ],
    },
    {
        id: 'inventory',
        label: 'Gestión Inventario',
        icon: databaseIcon,
        subitems: [
            { id: 'products', label: 'Repuestos & Precios' },
            { id: 'transfers', label: 'Traslados entre Bodegas' },
            { id: 'brands', label: 'Marcas' },
            { id: 'categories', label: 'Categorías' },
            { id: 'models', label: 'Modelos' },
            { id: 'movements', label: 'Auditoría de Stock' },
        ],
    },
    {
        id: 'wallet',
        label: 'Cartera & Banco',
        icon: walletIcon,
        subitems: [
            { id: 'creditClients', label: 'Créditos & Cupos' },
            { id: 'paymentVerification', label: 'Abonos & Recaudos' },
            { id: 'bankReconciliation', label: 'Careo Bancario' },
        ],
    },
    {
        id: 'thirdParties',
        label: 'Terceros & Roles',
        icon: userIcon,
        subitems: [
            { id: 'customers', label: 'Clientes' },
            { id: 'employees', label: 'Empleados & Sedes' },
            { id: 'rolesPermissions', label: 'Roles & Permisos' },
        ],
    },
    {
        id: 'reports',
        label: 'Reportes & Auditoría',
        icon: fileTextIcon,
        subitems: [
            { id: 'dailySales', label: 'Ventas & Rentabilidad' },
            { id: 'generalReport', label: 'Reporte General' },
            { id: 'inventoryReport', label: 'Stock & Rotación' },
            { id: 'recycleBin', label: 'Papelera de Reciclaje' },
        ],
    },
]

// Título de la cabecera por módulo
export const MODULE_HEADER_TITLES: Record<ERPModule, string> = {
    shop: 'Tienda & Cotización',
    sales: 'Gestión Ventas',
    cashRegister: 'Gestión Ventas',
    purchases: 'Gestión Compras',
    inventory: 'Gestión Inventario',
    transfers: 'Traslados entre Bodegas',
    wallet: 'Cartera & Banco',
    thirdParties: 'Terceros & Roles',
    reports: 'Reportes & Auditoría',
    settings: 'Configuración del Sistema',
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
}
