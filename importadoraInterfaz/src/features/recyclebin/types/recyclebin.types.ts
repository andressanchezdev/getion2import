// recyclebin.types.ts · tipos para el módulo de papelera de reciclaje y restauración
export interface RecycleBinItem {
  id: number
  companyId?: number | null
  entityTable: string
  entityId: number
  entityLabel: string
  entityData?: Record<string, unknown> | null
  deletedByActorType: string
  deletedByActorId: number
  deletedByActorName: string
  deletedAt: string
  isRestored: boolean
  restoredAt?: string | null
  restoredByActorId?: number | null
  restoredByActorName?: string | null
}

export interface RecycleBinFilters {
  table?: string
  isRestored?: boolean
  search?: string
  page?: number
  pageSize?: number
}

