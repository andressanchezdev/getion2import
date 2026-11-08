// BackupsScreen · Gestión Superadmin > Respaldos: crear un respaldo manual de toda la base, descargarlo y volver a uno (en especial al último)
// conecta con: useBackups (estado y acciones), ReasonPrompt (la nota y el motivo se piden en el panel derecho), Pill y RowActions (global); el backend solo deja entrar al superadmin
// ojo: son siempre manuales (no hay respaldos automáticos); restaurar reemplaza TODA la base y antes guarda un respaldo de seguridad del estado actual
import React, { useState } from 'react'
import './BackupsScreen.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatDateTime } from '@/global/helpers/formatting/format'
import { formatBytes } from '@/global/helpers/images/imageOptimizer'
import fileIcon from '@/assets/icons/file-text.svg?raw'
import refreshIcon from '@/assets/icons/refresh.svg?raw'
import { useBackups } from '../hooks/useBackups'
import type { Backup } from '../types/backups.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

const NOTE_MAX = 200 // la API acepta notas de hasta 200 caracteres

export const BackupsScreen: React.FC = () => {
  const { backups, latest, loading, error, creating, restoring, downloadingId, load, create, download, restore } = useBackups()
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [toRestore, setToRestore] = useState<Backup | null>(null)

  return (
    <div className="backups-screen">
      <div className="data-card">
        <div className="backups-summary">
          <div className="backups-summary-text">
            <span className="backups-summary-title">
              {latest ? `Último respaldo: ${formatDateTime(latest.createdAt)}` : 'Aún no hay respaldos'}
            </span>
            <span className="backups-summary-sub">
              {latest ? `${latest.createdByEmail || latest.createdByType} · ${formatBytes(latest.sizeBytes)}${latest.note ? ` · ${latest.note}` : ''}` : 'Crea el primero antes de hacer cambios grandes.'}
            </span>
          </div>
          <div className="backups-actions">
            <button type="button" className="btn-primary" onClick={() => setCreatingOpen(true)} disabled={creating || restoring}>
              {creating ? 'Creando respaldo…' : 'Crear respaldo ahora'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => latest && setToRestore(latest)} disabled={!latest || creating || restoring}>
              Restaurar el último respaldo
            </button>
          </div>
        </div>
        <div className="backups-note">
          Los respaldos son manuales. Contienen toda la base de datos. Descarga una copia a tu equipo: si el servidor se pierde, esa copia es la que te salva.
        </div>

        <DataTable tableId="backups-backups" className="backups-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Creado por</th>
                <th>Nota</th>
                <th>Tamaño</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && backups.length === 0 ? (
                <tr><td colSpan={6} className="backups-table-empty">Cargando respaldos…</td></tr>
              ) : error && backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="backups-table-empty">
                    <p style={{ color: 'var(--c-red-600)' }}>{error}</p>
                    <button type="button" className="btn-secondary" style={{ marginTop: '8px' }} onClick={load}>Reintentar</button>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan={6} className="backups-table-empty">Todavía no hay respaldos.</td></tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id}>
                    <td>
                      <strong>{formatDateTime(backup.createdAt)}</strong>
                      {backup.isLatest && <> <Pill tone="green">Último</Pill></>}
                    </td>
                    <td>
                      <Pill tone={backup.kind === 'manual' ? 'blue' : 'gray'}>{backup.kind === 'manual' ? 'Manual' : 'Seguridad previa'}</Pill>
                    </td>
                    <td>{backup.createdByEmail || backup.createdByType || '—'}</td>
                    <td>{backup.note || '—'}</td>
                    <td>{formatBytes(backup.sizeBytes)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <RowActions
                        actions={[
                          { key: 'download', label: downloadingId === backup.id ? 'Descargando…' : 'Descargar respaldo', icon: fileIcon, onClick: () => void download(backup) },
                          { key: 'restore', label: 'Restaurar este respaldo', icon: refreshIcon, tone: 'danger', onClick: () => setToRestore(backup) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
      </div>

      <ReasonPrompt
        open={creatingOpen}
        title="Crear respaldo"
        message="Se guardará una copia completa de la base de datos tal como está ahora. Puede tardar unos segundos."
        confirmLabel="Crear respaldo"
        fieldLabel="Nota (opcional)"
        placeholder="Ej: antes de actualizar precios"
        minLength={0}
        maxLength={NOTE_MAX}
        onConfirm={(text) => {
          setCreatingOpen(false)
          void create(text)
        }}
        onCancel={() => setCreatingOpen(false)}
      />

      <ReasonPrompt
        open={toRestore !== null}
        title="Restaurar respaldo"
        message={`Vas a reemplazar TODA la base de datos por la del respaldo del ${toRestore ? formatDateTime(toRestore.createdAt) : ''}. Todo lo hecho después se perderá (queda un respaldo de seguridad del estado actual). Todos tendrán que volver a iniciar sesión.`}
        confirmLabel="Restaurar"
        onConfirm={(reason) => {
          const target = toRestore
          setToRestore(null)
          if (target) void restore(target, reason)
        }}
        onCancel={() => setToRestore(null)}
      />
    </div>
  )
}

export default BackupsScreen
