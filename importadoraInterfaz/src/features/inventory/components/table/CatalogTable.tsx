// CatalogTable — tabla de un catálogo base (marcas, categorías o modelos): buscador, botón crear y una fila por registro
// conecta con: CatalogTableRow (las filas), catalogs.labels (textos) y navigation (abrir el panel de crear, ver y editar)
import React, { useState } from 'react'
import '../InventoryTables.css'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { singularOf, type CatalogRow, type CatalogType } from '@/features/catalogs'
import { deleteCatalogItemThunk, saveCatalogItemThunk } from '@/features/catalogs/thunks/catalogs.items.thunks'
import { toast } from '@/global/helpers/feedback/toast'
import { CatalogTableRow } from './CatalogTableRow'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { ConfirmDialog } from '@/global/components/UI/molecules/dialogs/ConfirmDialog'

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
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  const needle = search.trim().toLowerCase()
  const visible = rows.filter((row) => !needle || row.name.toLowerCase().includes(needle))
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

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await dispatch(deleteCatalogItemThunk({ type, id: toDelete.id })).unwrap()
      toast.success(`${singular} eliminada correctamente.`)
      setToDelete(null)
      setDeleteReason('')
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
                    onDelete={(item) => {
                      setToDelete(item)
                      setDeleteReason('')
                    }}
                    onToggleStatus={handleToggleStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} label="Paginación del catálogo" onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Eliminar ${singular}`}
        message={`¿Estás seguro de que deseas eliminar ${toDelete?.name}? Esta acción enviará el registro a la papelera.`}
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        confirmDisabled={deleting || deleteReason.trim().length < 3}
        confirmDisabledReason={deleteReason.trim().length < 3 ? 'Debes especificar el motivo de eliminación (mínimo 3 caracteres).' : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setToDelete(null)
            setDeleteReason('')
          }
        }}
      >
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
            Motivo de la eliminación (mínimo 3 caracteres) *
          </label>
          <textarea
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              fontSize: '13px',
              resize: 'vertical',
            }}
            rows={3}
            placeholder="Especifica el motivo por el cual eliminas este elemento..."
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            maxLength={200}
            disabled={deleting}
            required
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}

export default CatalogTable
