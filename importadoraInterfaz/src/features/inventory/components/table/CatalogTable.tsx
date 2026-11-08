// CatalogTable — tabla de un catálogo base (marcas, categorías o modelos): buscador, botón crear y una fila por registro
// conecta con: CatalogTableRow (las filas), catalogs.labels (textos) y navigation (abrir el panel de crear, ver y editar)
import React, { useState } from 'react'
import '../InventoryTables.css'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { singularOf, deleteCatalogItemThunk, saveCatalogItemThunk, type CatalogRow, type CatalogType } from '@/features/catalogs'
import { toast } from '@/global/helpers/feedback/toast'
import { CatalogTableRow } from './CatalogTableRow'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { ReasonPrompt } from '@/features/reasonPrompt'

export type { CatalogRow, CatalogType }

interface CatalogTableProps {
  type: CatalogType
  noun: string // 'marcas', 'categorías', 'modelos'...
  rows: CatalogRow[]
  loading: boolean
  failed: boolean
  withImage?: boolean
}

// el texto que reemplaza a las filas cuando no hay nada que mostrar
const emptyMessage = (noun: string, failed: boolean, loading: boolean, visible: number) =>
  failed ? `No se pudieron cargar las ${noun}.` : loading ? `Cargando ${noun}…` : visible === 0 ? `No se encontraron ${noun}.` : null

export const CatalogTable: React.FC<CatalogTableProps> = ({ type, noun, rows, loading, failed, withImage = false }) => {
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [cloningId, setCloningId] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<CatalogRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const needle = search.trim().toLowerCase()
  // Priorizar registros activos primero, luego alfabéticamente por nombre
  const sortedRows = [...rows].sort((a, b) => {
    const aActive = a.isActive !== false ? 1 : 0
    const bActive = b.isActive !== false ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  })
  const visible = sortedRows.filter((row) => !needle || row.name.toLowerCase().includes(needle))
  const { pageItems, meta, setPage } = usePagedList(visible, needle)
  const message = emptyMessage(noun, failed, loading, visible.length)
  const singular = singularOf(noun)

  const openItem = (kind: 'catalogItem' | 'catalogDetail', item?: CatalogRow) => dispatch(openDrawerForm({ kind, payload: { type, noun, item } }))

  const handleClone = async (row: CatalogRow) => {
    setCloningId(row.id)
    try {
      await dispatch(
        saveCatalogItemThunk({
          type,
          name: `${row.name} (Copia)`,
          imageUrl: row.image,
          description: row.description,
        })
      ).unwrap()
      toast.success(`${singular} clonada correctamente`)
    } catch {
      toast.error('No se pudo clonar el registro.')
    } finally {
      setCloningId(null)
    }
  }

  const handleToggleStatus = async (row: CatalogRow) => {
    const nextActive = row.isActive === false
    setTogglingId(row.id)
    try {
      await dispatch(
        saveCatalogItemThunk({
          type,
          id: row.id,
          name: row.name,
          imageUrl: row.image,
          description: row.description,
          isActive: nextActive,
        })
      ).unwrap()
      toast.success(`${singular} marcado como ${nextActive ? 'Activo' : 'Inactivo'}`)
    } catch {
      toast.error('No se pudo actualizar el estado.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async (reason: string) => {
    const target = toDelete
    if (!target) return
    setToDelete(null)
    setDeleting(true)
    try {
      await dispatch(deleteCatalogItemThunk({ type, id: target.id, reason })).unwrap()
      toast.success(`${singular} eliminada correctamente.`)
    } catch (err: unknown) {
      toast.error(typeof err === 'string' ? err : `Error al eliminar la ${singular.toLowerCase()}.`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="inv-screen">
      <div className="inv-card">
        <div className="inv-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            hasActiveFilters={Boolean(search)}
            onClear={() => setSearch('')}
            placeholder={`Buscar entre las ${noun}...`}
            className="inv-search"
          />
          <div className="inv-toolbar-actions">
            <span className="inv-count">
              {rows.length} {noun}
            </span>
            <button type="button" className="btn-primary" onClick={() => openItem('catalogItem')}>
              + Crear {singular}
            </button>
          </div>
        </div>

        <div className="inv-table-responsive table-scroll">
          <table className="inv-table">
            <thead>
              <tr>
                {withImage && <th>Logo</th>}
                <th>N.º</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th className="inv-actions-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <tr>
                  <td colSpan={withImage ? 5 : 4} className="inv-message">
                    {message}
                  </td>
                </tr>
              ) : (
                pageItems.map((row) => (
                  <CatalogTableRow
                    key={row.id}
                    row={row}
                    singular={singular}
                    withImage={withImage}
                    deleting={deleting && toDelete?.id === row.id}
                    cloning={cloningId === row.id}
                    toggling={togglingId === row.id}
                    onView={(item) => openItem('catalogDetail', item)}
                    onEdit={(item) => openItem('catalogItem', item)}
                    onClone={handleClone}
                    onDelete={setToDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} label="Paginación del catálogo" onPageChange={setPage} />
      </div>

      <ReasonPrompt
        open={toDelete !== null}
        title={`Eliminar ${singular}`}
        message={`¿Estás seguro de que deseas eliminar ${toDelete?.name}? Esta acción enviará el registro a la papelera.`}
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

export default CatalogTable
