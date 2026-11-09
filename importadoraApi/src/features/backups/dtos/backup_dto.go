package dtos

// backup_dto.go · formas de entrada y salida del módulo de respaldos (qué viaja por HTTP)
// conecta con: el controller de respaldos (los recibe y devuelve) y el service (los llena)

import "time"

// BackupKind distingue el respaldo que pidió una persona del que el sistema toma solo antes de restaurar.
type BackupKind string

const (
	BackupKindManual     BackupKind = "manual"
	BackupKindPreRestore BackupKind = "pre_restore"
)

// BackupResponse es un respaldo de la lista.
type BackupResponse struct {
	ID             string     `json:"id"`
	FileName       string     `json:"fileName"`
	SizeBytes      int64      `json:"sizeBytes"`
	Kind           BackupKind `json:"kind"`
	Note           string     `json:"note"`
	CreatedByType  string     `json:"createdByType"`
	CreatedByEmail string     `json:"createdByEmail"`
	CreatedAt      time.Time  `json:"createdAt"`
	IsLatest       bool       `json:"isLatest"` // el último respaldo manual: al que se vuelve con «Restaurar el último»
}

// CreateBackupRequest entrada para POST /backups.
type CreateBackupRequest struct {
	Note string `json:"note"`
}

// RestoreBackupRequest entrada para POST /backups/:id/restore.
type RestoreBackupRequest struct {
	Reason string `json:"reason"`
}

// RestoreBackupResponse resultado de una restauración.
type RestoreBackupResponse struct {
	RestoredID     string    `json:"restoredId"`
	SafetyBackupID string    `json:"safetyBackupId"` // respaldo del estado anterior, por si hay que deshacer
	RestoredAt     time.Time `json:"restoredAt"`
}
