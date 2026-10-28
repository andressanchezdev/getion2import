// menuItems · lista fija del menú lateral (módulos y subgestiones)
// conecta con: SideMenu (lo pinta), navigation.slice (elige el primer subitem), MainContent (decide la pantalla)
// ojo: id va en inglés (código) y label en español (lo que ve el cliente); antes los subitems eran solo texto
// ojo: los nombres de las subgestiones son cortos (el módulo ya da el contexto); «Gestión Caja» ahora se llama «Gestión Ventas» (su id sigue siendo cashRegister) y «Marcas y Categorías» (id catalogs) se separó en brands, categories y models
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
            { id: 'catalog', label: 'Catálogo' },
            { id: 'orders', label: 'Pedidos' },
            { id: 'history', label: 'Historial' },
        ],
    },
    {
        id: 'cashRegister',
        label: 'Gestión Ventas',
        icon: packageIcon,
        subitems: [
            { id: 'posBilling', label: 'Facturación' },
            { id: 'billingHistory', label: 'Historial' },
            { id: 'shiftClose', label: 'Cierre de turno' },
        ],
    },
    {
        id: 'wallet',
        label: 'Gestión Cartera',
        icon: walletIcon,
        subitems: [
            { id: 'creditClients', label: 'Créditos' },
            { id: 'paymentVerification', label: 'Abonos' },
            { id: 'paymentHistory', label: 'Recaudos' },
        ],
    },
    {
        id: 'inventory',
        label: 'Gestión Inventario',
        icon: databaseIcon,
        subitems: [
            { id: 'products', label: 'Productos' },
            { id: 'transfers', label: 'Traslados' },
            { id: 'brands', label: 'Marcas' },
            { id: 'categories', label: 'Categorías' },
            { id: 'models', label: 'Modelos' },
            { id: 'movements', label: 'Auditoría' },
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
            { id: 'dailySales', label: 'Ventas' },
            { id: 'generalReport', label: 'General' },
            { id: 'inventoryReport', label: 'Inventario' },
        ],
    },
]

// título (lo que ve el cliente) que muestra MainContent arriba, por módulo
export const MODULE_HEADER_TITLES: Record<ERPModule, string> = {
    shop: 'Tienda',
    cashRegister: 'Gestión Ventas',
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
