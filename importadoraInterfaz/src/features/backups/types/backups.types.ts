// backups.types.ts · tipos del módulo de respaldos de la base de datos (solo superadmin)
export type BackupKind = 'manual' | 'pre_restore'

export interface Backup {
  id: string
  fileName: string
  sizeBytes: number
  kind: BackupKind
  note: string
  createdByType: string
  createdByEmail: string
  createdAt: string
  isLatest: boolean // el último respaldo manual: al que vuelve «Restaurar el último»
}

export interface RestoreResult {
  restoredId: string
  safetyBackupId: string // respaldo del estado anterior, por si hay que deshacer
  restoredAt: string
}
