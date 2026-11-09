// BackupTab.tsx · gestión visual de copias de seguridad de la base de datos
import React, { useEffect, useState } from 'react'
import './BackupTab.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { toast } from 'sonner'
import { backupsService, type BackupItem } from '../services/backups.service'

export const BackupTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const loadBackups = async () => {
    try {
      setLoading(true)
      const data = await backupsService.list()
      setBackups(data)
    } catch {
      toast.error('No se pudo cargar la lista de respaldos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBackups()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      await backupsService.create()
      toast.success('Copia de seguridad generada exitosamente')
      void loadBackups()
    } catch {
      toast.error('Error al generar la copia de seguridad')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (item: BackupItem) => {
    try {
      await backupsService.download(item.id, item.fileName)
      toast.success(`Descargando ${item.fileName}`)
    } catch {
      toast.error('No se pudo descargar el archivo de respaldo')
    }
  }

  const handleRestore = async (item: BackupItem) => {
    const reason = window.prompt(
      `ADVERTENCIA: Restaurar la base de datos reemplazará los datos actuales con el estado de ${item.fileName}.\n\nIndica el motivo de la restauración para continuar:`
    )
    if (!reason || !reason.trim()) return

    try {
      setRestoringId(item.id)
      await backupsService.restore(item.id, reason.trim())
      toast.success('Base de datos restaurada con éxito')
      void loadBackups()
    } catch {
      toast.error('Error durante la restauración de la base de datos')
    } finally {
      setRestoringId(null)
    }
  }

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDate = (iso: string): string => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="backup-tab">
      <div className="backup-toolbar">
        <div className="backup-stats">
          <span>Respaldos almacenados: <strong>{backups.length}</strong></span>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={creating}
          onClick={handleCreateBackup}
        >
          {creating ? 'Generando copia…' : '+ Crear Respaldo Ahora'}
        </button>
      </div>

      <div className="backup-table-card">
        <table className="backup-table">
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Fecha de Creación</th>
              <th>Tamaño</th>
              <th>Tipo</th>
              <th>Generado por</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="backup-empty">Cargando copias de seguridad…</td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={6} className="backup-empty">No hay copias de seguridad generadas. Puedes crear la primera arriba.</td>
              </tr>
            ) : (
              backups.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.fileName}</strong>
                    {item.isLatest && <span style={{ marginLeft: 6 }}><Pill tone="green">Último</Pill></span>}
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{formatSize(item.sizeBytes)}</td>
                  <td>
                    <Pill tone={item.kind === 'manual' ? 'blue' : 'amber'}>
                      {item.kind === 'manual' ? 'Manual' : 'Pre-restauración'}
                    </Pill>
                  </td>
                  <td>{item.createdByEmail || item.createdByType || 'Sistema'}</td>
                  <td>
                    <div className="backup-actions-cell">
                      <button
                        type="button"
                        className="backup-btn-download"
                        onClick={() => handleDownload(item)}
                      >
                        Descargar
                      </button>
                      <button
                        type="button"
                        className="backup-btn-restore"
                        disabled={restoringId === item.id}
                        onClick={() => handleRestore(item)}
                      >
                        {restoringId === item.id ? 'Restaurando…' : 'Restaurar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

