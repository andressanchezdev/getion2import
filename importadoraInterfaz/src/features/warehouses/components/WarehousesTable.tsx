// WarehousesTable — una sola tarjeta con búsqueda, filtro de estado, contador, botón de crear y la tabla de bodegas (sedes)
// conecta con: WarehousesScreen (la usa), useManagedWarehouses y useWarehouseActions, RowActions (ver detalles, editar y gestionar ubicaciones), Pill (marca y avisos), Pagination, usePermissions y navigation (abre el panel 'warehouseForm' o 'warehouseDetail')
import React, { useState } from 'react'
import './WarehousesTable.css'
import '@/features/inventory/components/InventoryTables.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import copyIcon from '@/assets/icons/copy.svg?raw'
import mapPinIcon from '@/assets/icons/map-pin.svg?raw'
import { WAREHOUSE_STATUS_OPTIONS } from '../constants/warehouses.constants'
import type { WarehouseStatusFilter } from '../helpers/warehouses.manage'
import { useManagedWarehouses } from '../hooks/useManagedWarehouses'
import { useWarehouseActions } from '../hooks/useWarehouseActions'
import type { Warehouse } from '../types/warehouse.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

interface WarehousesTableProps {
    onManageLocations?: (warehouse: Warehouse) => void
}

export const WarehousesTable: React.FC<WarehousesTableProps> = ({ onManageLocations }) => {
    const dispatch = useAppDispatch()
    const permissions = usePermissions()
    const canCreate = permissions.canPerformAction('inventory', 'warehouses', 'create')
    const canEdit = permissions.canPerformAction('inventory', 'warehouses', 'update')
    const list = useManagedWarehouses()
    const actions = useWarehouseActions()
    const [toDeactivate, setToDeactivate] = useState<Warehouse | null>(null)
    const { pageItems, meta, setPage } = usePagedList(list.items, `${list.search}|${list.status}`)

    const message = list.failed
        ? list.error
        : list.loading
        ? 'Cargando bodegas…'
        : list.items.length === 0
        ? list.hasFilters
            ? 'No hay bodegas que coincidan con la búsqueda.'
            : 'Todavía no hay bodegas registradas.'
        : null

    return (
        <div className="data-card">
            <div className="data-toolbar">
                <SearchBar
                    value={list.search}
                    onChange={list.setSearch}
                    hasActiveFilters={list.hasFilters}
                    onClear={list.clearFilters}
                    placeholder="Buscar por código, nombre, ciudad o administrador..."
                    className="wh-search"
                />
                <FilterSelect
                    label="Estado"
                    emptyValue="all"
                    value={list.status}
                    options={WAREHOUSE_STATUS_OPTIONS}
                    onChange={(value) => list.setStatus((value || 'all') as WarehouseStatusFilter)}
                />
                <span className="wh-count" aria-live="polite">
                    Mostrando {list.items.length} de {list.all.length} bodegas
                </span>
                <button
                    type="button"
                    className="btn-primary wh-create"
                    disabled={!canCreate}
                    title={canCreate ? undefined : 'Requiere permiso para crear bodegas'}
                    onClick={() => dispatch(openDrawerForm({ kind: 'warehouseForm', payload: {} }))}
                >
                    <Icon svg={plusIcon} /> Nueva bodega
                </button>
            </div>

            <DataTable tableId="warehouses-warehouses" className="wh-table">
                    <thead>
                        <tr>
                            <th>Bodega</th>
                            <th>Código</th>
                            <th>Ciudad</th>
                            <th>Dirección</th>
                            <th>Administrador</th>
                            <th className="wh-num">Ubicaciones</th>
                            <th className="wh-num">SKUs con stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {message ? (
                            <tr>
                                <td colSpan={9} className="wh-empty">{message}</td>
                            </tr>
                        ) : (
                            pageItems.map((warehouse) => {
                                const recent = list.recent?.id === warehouse.id ? list.recent.kind : null
                                const active = warehouse.isActive !== false
                                return (
                                    <tr key={warehouse.id} className={active ? '' : 'wh-row-inactive'}>
                                        <td>
                                            <div className="wh-cell">
                                                <strong>
                                                    {warehouse.name}
                                                    {recent && <Pill tone={recent === 'new' ? 'green' : 'blue'}>{recent === 'new' ? 'Nueva' : 'Actualizada'}</Pill>}
                                                </strong>
                                                {warehouse.description && <small>{warehouse.description}</small>}
                                            </div>
                                        </td>
                                        <td>{warehouse.code || '—'}</td>
                                        <td>{warehouse.city || '—'}</td>
                                        <td>{warehouse.address || '—'}</td>
                                        <td>{warehouse.managerName || <span className="wh-muted">Sin asignar</span>}</td>
                                        <td className="wh-num table-amount">
                                            {warehouse.locationCount ? warehouse.locationCount : <Pill tone="amber">Sin ubicaciones</Pill>}
                                        </td>
                                        <td className="wh-num table-amount">{warehouse.skuCount ?? 0}</td>
                                        <td>
                                            <select
                                                className={`inv-status-select is-${active ? 'active' : 'inactive'}`}
                                                value={active ? 'active' : 'inactive'}
                                                disabled={!canEdit || actions.saving}
                                                aria-label={`Estado de ${warehouse.name}`}
                                                title={canEdit ? 'Cambiar estado' : 'Requiere permiso para editar bodegas'}
                                                onChange={(event) => {
                                                    if (event.target.value === 'active') void actions.setActive(warehouse, true)
                                                    else setToDeactivate(warehouse)
                                                }}
                                            >
                                                <option value="active">Activa</option>
                                                <option value="inactive">Inactiva</option>
                                            </select>
                                        </td>
                                        <td>
                                            <RowActions
                                                actions={[
                                                    {
                                                        key: 'detail',
                                                        label: `Ver detalles de ${warehouse.name}`,
                                                        icon: eyeIcon,
                                                        onClick: () =>
                                                            dispatch(
                                                                openDrawerForm({
                                                                    kind: 'warehouseDetail',
                                                                    payload: {
                                                                        warehouse,
                                                                        onOpenLocations: onManageLocations,
                                                                    },
                                                                })
                                                            ),
                                                    },
                                                    {
                                                        key: 'edit',
                                                        label: `Editar la sede ${warehouse.name}`,
                                                        icon: editIcon,
                                                        visible: canEdit,
                                                        onClick: () => dispatch(openDrawerForm({ kind: 'warehouseForm', payload: { warehouse } })),
                                                    },
                                                    {
                                                        key: 'locations',
                                                        label: `Gestionar ubicaciones de ${warehouse.name}`,
                                                        icon: mapPinIcon,
                                                        onClick: () => (onManageLocations ? onManageLocations(warehouse) : actions.openLocations(warehouse)),
                                                    },
                                                    {
                                                        key: 'cloneLocation',
                                                        label: `Clonar ubicación en ${warehouse.name}`,
                                                        icon: copyIcon,
                                                        onClick: () => (onManageLocations ? onManageLocations(warehouse) : actions.openLocations(warehouse)),
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </DataTable>
            <Pagination meta={meta} label="Paginación de bodegas" onPageChange={setPage} />
            <ReasonPrompt
                open={Boolean(toDeactivate)}
                title="Desactivar bodega"
                message={`¿Desactivar la bodega "${toDeactivate?.name ?? ''}"? Se cerrarán las sesiones de sus empleados.`}
                confirmLabel="Desactivar"
                onConfirm={async (reason) => {
                    if (toDeactivate) await actions.setActive(toDeactivate, false, reason)
                    setToDeactivate(null)
                }}
                onCancel={() => setToDeactivate(null)}
            />
        </div>
    )
}

export default WarehousesTable
