// useBackups.ts · estado de la pantalla de respaldos: lista, crear, descargar y restaurar, con avisos de éxito o error
// conecta con: BackupsScreen (lo usa), backups.service (HTTP), toast y saveBlob
// ojo: tras restaurar la base cambió por completo (usuarios, sesiones, todo): se recarga la aplicación para empezar limpio
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/api/http/errors'
import { toast } from '@/global/helpers/feedback/toast'
import { saveBlob } from '@/global/helpers/files/saveBlob'
import { createBackup, downloadBackup, fetchBackups, restoreBackup } from '../services/backups.service'
import type { Backup } from '../types/backups.types'

export const useBackups = () => {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBackups(await fetchBackups())
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los respaldos.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const create = useCallback(
    async (note: string) => {
      setCreating(true)
      try {
        const created = await createBackup(note)
        toast.success(`Respaldo ${created.id} creado.`)
        await load()
      } catch (err) {
        toast.error(getErrorMessage(err, 'No se pudo crear el respaldo.'))
      } finally {
        setCreating(false)
      }
    },
    [load]
  )

  const download = useCallback(async (backup: Backup) => {
    setDownloadingId(backup.id)
    try {
      saveBlob(await downloadBackup(backup.id), backup.fileName)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo descargar el respaldo.'))
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const restore = useCallback(async (backup: Backup, reason: string) => {
    setRestoring(true)
    try {
      const result = await restoreBackup(backup.id, reason)
      toast.success(`Base restaurada. Quedó un respaldo de seguridad del estado anterior (${result.safetyBackupId}).`)
      window.setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo restaurar el respaldo.'))
      setRestoring(false)
    }
  }, [])

  return { backups, latest: backups.find((b) => b.isLatest) ?? null, loading, error, creating, restoring, downloadingId, load, create, download, restore }
}
