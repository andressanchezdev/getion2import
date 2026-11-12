// inventory.entries — entradas del registro de formularios del panel derecho de inventario: productos, catálogos, ubicaciones y etiquetas QR
// conecta con: formRegistry (las junta), los paneles de cada feature y los íconos de assets
import { createElement } from 'react'
import { RelocateStockPanel, type RelocateStockPayload } from '@/features/transfers'
import { ProductDetailPanel, EditProductPanel, ProductLocationsPanel, CreateProductForm } from '@/features/inventory'
import { LocationFormPanel, LocationDetailPanel, type LocationFormPayload, type LocationDetailPayload } from '@/features/locations'
import { QrLabelSheet, type QrLabelsPayload } from '@/global/components/UI/molecules/qr/QrLabelSheet'
import { CatalogItemFormPanel, CatalogItemDetailPanel, type CatalogItemPayload } from '@/features/catalogs'
import type { Product } from '@/features/shop'
import editIcon from '@/assets/icons/edit.svg'
import listIcon from '@/assets/icons/list.svg'
import eyeIcon from '@/assets/icons/eye.svg'
import { WarehouseFormPanel, WarehouseDetailPanel, type WarehouseFormPayload, type WarehouseDetailPayload } from '@/features/warehouses'
import { AssignStockPanel, type AssignStockPayload } from '@/features/inventory'
import mapPinIcon from '@/assets/icons/map-pin.svg'
import qrIcon from '@/assets/icons/qr-code.svg'
import type { DrawerFormKind } from '@/features/navigation'
import type { FormEntry } from './formEntry.types'

export const INVENTORY_ENTRIES: Partial<Record<DrawerFormKind, FormEntry>> = {
  productDetail: {
    permission: ['products:view_detail', 'catalog:view'],
    icon: listIcon,
    title: (payload) => (payload as Product).name || 'Detalle del producto',
    subtitle: 'Información general y tarifas',
    render: (payload) => createElement(ProductDetailPanel, { key: String((payload as Product).id), product: payload as Product }),
  },
  editProduct: {
    permission: ['products:edit'],
    icon: editIcon,
    title: () => 'Editar Producto',
    subtitle: 'Datos básicos, categoría y estado',
    render: (payload) => createElement(EditProductPanel, { key: String((payload as Product).id), product: payload as Product }),
  },
  productLocations: {
    permission: ['stock:view', 'products:view_detail'],
    icon: mapPinIcon,
    title: (payload) => (payload as Product).name || 'Ubicaciones del producto',
    subtitle: 'Existencias y ubicación física por bodega',
    render: (payload) => createElement(ProductLocationsPanel, { key: String((payload as Product).id), product: payload as Product }),
  },
  relocateStock: {
    permission: ['stock:relocate'],
    icon: editIcon,
    title: () => 'Reubicar producto',
    subtitle: 'Mover existencias dentro de la bodega',
    render: (payload) => createElement(RelocateStockPanel, { payload: payload as RelocateStockPayload }),
  },
  createProduct: {
    permission: ['products:create'],
    icon: listIcon,
    title: () => 'Nuevo Producto',
    subtitle: 'Datos, categoría, marca, modelo, tarifas y ubicación',
    render: () => createElement(CreateProductForm),
  },
  catalogItem: {
    permission: ['brands:create', 'brands:edit', 'models:create', 'models:edit', 'categories:create', 'categories:edit'],
    icon: editIcon,
    title: (payload) =>
      (payload as CatalogItemPayload).item
        ? `Editar ${(payload as CatalogItemPayload).noun.slice(0, -1)}`
        : `Nueva ${(payload as CatalogItemPayload).noun.slice(0, -1)}`,
    subtitle: 'Gestión de catálogo',
    render: (payload) => createElement(CatalogItemFormPanel, { payload: payload as CatalogItemPayload }),
  },
  catalogDetail: {
    permission: ['brands:view_detail', 'models:view_detail', 'categories:view_detail'],
    icon: listIcon,
    title: (payload) => (payload as CatalogItemPayload).item?.name || 'Detalle',
    subtitle: 'Información del catálogo',
    render: (payload) => createElement(CatalogItemDetailPanel, { payload: payload as CatalogItemPayload }),
  },
  qrLabels: {
    permission: ['products:view', 'stock:view'],
    icon: qrIcon,
    title: (payload) => (payload as QrLabelsPayload).heading,
    subtitle: 'Códigos QR para imprimir y pegar',
    render: (payload) => createElement(QrLabelSheet, { payload: payload as QrLabelsPayload }),
  },
  assignStock: {
    permission: ['stock:edit'],
    icon: mapPinIcon,
    title: () => 'Asignar producto a ubicación',
    subtitle: 'Pon un producto del catálogo en un estante',
    render: (payload) => createElement(AssignStockPanel, { payload: payload as AssignStockPayload | undefined }),
  },
  warehouseForm: {
    permission: ['warehouses:create', 'warehouses:edit'],
    icon: mapPinIcon,
    title: (payload) => ((payload as WarehouseFormPayload).warehouse ? 'Editar sede' : 'Nueva bodega'),
    subtitle: 'Datos, ubicación y administrador',
    render: (payload) => createElement(WarehouseFormPanel, { key: String((payload as WarehouseFormPayload).warehouse?.id ?? 'new'), payload: payload as WarehouseFormPayload }),
  },
  warehouseDetail: {
    permission: ['warehouses:view_detail'],
    icon: eyeIcon,
    title: (payload) => (payload as WarehouseDetailPayload).warehouse?.name || 'Detalle de la sede',
    subtitle: 'Información de la sede y operación',
    render: (payload) => createElement(WarehouseDetailPanel, { key: String((payload as WarehouseDetailPayload).warehouse?.id ?? 'detail'), payload: payload as WarehouseDetailPayload }),
  },
  locationForm: {
    permission: ['stock:edit'],
    icon: mapPinIcon,
    title: (payload) => ((payload as LocationFormPayload).location ? 'Editar ubicación' : 'Nueva ubicación'),
    subtitle: 'Estante o pasillo de la bodega',
    render: (payload) => createElement(LocationFormPanel, { key: String((payload as LocationFormPayload).location?.id ?? 'new'), payload: payload as LocationFormPayload }),
  },
  locationDetail: {
    permission: ['stock:view', 'warehouses:view'],
    icon: mapPinIcon,
    title: (payload) => (payload as LocationDetailPayload).location.code,
    subtitle: 'Productos guardados en la ubicación',
    render: (payload) => createElement(LocationDetailPanel, { key: String((payload as LocationDetailPayload).location.id), payload: payload as LocationDetailPayload }),
  },
}
