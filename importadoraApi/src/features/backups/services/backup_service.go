package services

// backup_service.go · reglas de negocio de los respaldos: crear, listar, descargar y restaurar la base completa (solo superadmin, siempre manual)
// conecta con: BackupStore (archivos), PgToolsRepository (pg_dump y pg_restore), AuditRepository (quién y por qué); lo llama el controller y la conexión llega del contenedor
// ojo: solo corre una operación a la vez; antes de restaurar se guarda solo un respaldo del estado actual para poder deshacer

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/backups/dtos"
	"importadoraApi/src/features/backups/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxNoteLength    = 200
	operationTimeout = 20 * time.Minute
)

type BackupService struct {
	pool      *pgxpool.Pool
	store     *repositories.BackupStore
	pgTools   *repositories.PgToolsRepository
	auditRepo *authRepos.AuditRepository
	busy      sync.Mutex
}

// NewBackupService crea el servicio con las piezas que necesita para funcionar.
func NewBackupService(pool *pgxpool.Pool, store *repositories.BackupStore, pgTools *repositories.PgToolsRepository, auditRepo *authRepos.AuditRepository) *BackupService {
	return &BackupService{pool: pool, store: store, pgTools: pgTools, auditRepo: auditRepo}
}

func requireSuperadmin(actor *middlewares.ActorContext) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if actor.ActorType != types.ActorSuperadmin {
		return utils.Forbidden("FORBIDDEN_SUPERADMIN", "Solo un superadministrador puede gestionar los respaldos.")
	}
	return nil
}

// List devuelve los respaldos del más nuevo al más viejo y marca el último manual.
func (s *BackupService) List(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.BackupResponse, error) {
	if err := requireSuperadmin(actor); err != nil {
		return nil, err
	}
	items, err := s.store.List()
	if err != nil {
		return nil, utils.Internal("No se pudo leer la carpeta de respaldos.", err)
	}
	latestManual := ""
	for _, it := range items {
		if it.Kind == string(dtos.BackupKindManual) {
			latestManual = it.ID // la lista viene del más nuevo al más viejo: el primero manual es el último
			break
		}
	}
	out := make([]dtos.BackupResponse, 0, len(items))
	for _, it := range items {
		out = append(out, toResponse(it, it.ID == latestManual))
	}
	return out, nil
}

// Create genera un respaldo completo de la base ahora mismo.
func (s *BackupService) Create(ctx context.Context, actor *middlewares.ActorContext, note, ip, ua string) (*dtos.BackupResponse, error) {
	if err := requireSuperadmin(actor); err != nil {
		return nil, err
	}
	note = strings.TrimSpace(note)
	if len([]rune(note)) > maxNoteLength {
		return nil, utils.BadRequest("INVALID_NOTE", fmt.Sprintf("La nota no puede superar %d caracteres.", maxNoteLength))
	}
	if !s.busy.TryLock() {
		return nil, utils.Conflict("BACKUP_BUSY", "Ya hay un respaldo o una restauración en curso. Espera a que termine.")
	}
	defer s.busy.Unlock()

	meta, err := s.dump(ctx, actor, dtos.BackupKindManual, note)
	if err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "BACKUP_CREATED", reasonOrDefault(note, "Respaldo manual de la base de datos"), ip, ua, map[string]any{"backupId": meta.ID, "sizeBytes": meta.SizeBytes})
	resp := toResponse(*meta, true)
	return &resp, nil
}

// Path devuelve la ruta del archivo de un respaldo y el nombre con el que se descarga.
func (s *BackupService) Path(ctx context.Context, actor *middlewares.ActorContext, id string) (string, string, error) {
	if err := requireSuperadmin(actor); err != nil {
		return "", "", err
	}
	meta, err := s.find(id)
	if err != nil {
		return "", "", err
	}
	return s.store.DumpPath(meta.ID), meta.ID + ".dump", nil
}

// Restore vuelve la base completa al estado de un respaldo. Primero guarda el estado actual como respaldo de seguridad.
func (s *BackupService) Restore(ctx context.Context, actor *middlewares.ActorContext, id, reason, ip, ua string) (*dtos.RestoreBackupResponse, error) {
	if err := requireSuperadmin(actor); err != nil {
		return nil, err
	}
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return nil, verr
	}
	target, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if !s.busy.TryLock() {
		return nil, utils.Conflict("BACKUP_BUSY", "Ya hay un respaldo o una restauración en curso. Espera a que termine.")
	}
	defer s.busy.Unlock()

	safety, err := s.dump(ctx, actor, dtos.BackupKindPreRestore, "Estado previo a restaurar "+target.ID)
	if err != nil {
		return nil, err
	}

	// ojo: se separa de la petición para que un cliente que se desconecta no corte la restauración a la mitad
	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), operationTimeout)
	defer cancel()
	if err := s.pgTools.Restore(opCtx, s.store.DumpPath(target.ID)); err != nil {
		return nil, s.mapToolError("No se pudo restaurar el respaldo; la base quedó como estaba.", err)
	}
	// las conexiones abiertas conocían el esquema anterior: se cierran para que se abran limpias
	s.pool.Reset()

	now := time.Now().UTC()
	s.audit(ctx, actor, "BACKUP_RESTORED", reason, ip, ua, map[string]any{"backupId": target.ID, "safetyBackupId": safety.ID})
	return &dtos.RestoreBackupResponse{RestoredID: target.ID, SafetyBackupID: safety.ID, RestoredAt: now}, nil
}

// dump genera el archivo, lo publica con su ficha y devuelve el respaldo creado.
func (s *BackupService) dump(ctx context.Context, actor *middlewares.ActorContext, kind dtos.BackupKind, note string) (*repositories.BackupEntity, error) {
	if err := s.store.EnsureDir(); err != nil {
		return nil, utils.Internal("No se pudo crear la carpeta de respaldos.", err)
	}
	now := time.Now().UTC()
	id := s.store.NewID(string(kind), now)

	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), operationTimeout)
	defer cancel()
	if err := s.pgTools.Dump(opCtx, s.store.PartialPath(id)); err != nil {
		s.store.DiscardPartial(id)
		return nil, s.mapToolError("No se pudo generar el respaldo.", err)
	}
	meta := repositories.BackupEntity{
		ID: id, Kind: string(kind), Note: note,
		CreatedByType: string(actor.ActorType), CreatedByID: actor.ActorID, CreatedByEmail: actor.Email,
		CreatedAt: now,
	}
	if err := s.store.Commit(meta); err != nil {
		s.store.DiscardPartial(id)
		return nil, utils.Internal("No se pudo guardar el respaldo.", err)
	}
	saved, err := s.store.Find(id)
	if err != nil {
		return nil, utils.Internal("El respaldo se generó pero no se pudo leer.", err)
	}
	return saved, nil
}

func (s *BackupService) find(id string) (*repositories.BackupEntity, error) {
	meta, err := s.store.Find(id)
	if err != nil {
		if errors.Is(err, repositories.ErrBackupNotFound) {
			return nil, utils.NotFound("BACKUP_NOT_FOUND", "El respaldo no existe.")
		}
		return nil, utils.Internal("No se pudo leer el respaldo.", err)
	}
	return meta, nil
}

func (s *BackupService) mapToolError(message string, err error) error {
	if errors.Is(err, repositories.ErrPgToolMissing) {
		return utils.Unprocessable("PG_TOOLS_MISSING", "El servidor no tiene instaladas las herramientas de PostgreSQL (pg_dump / pg_restore). Instálalas o indica su ruta en PG_DUMP_PATH y PG_RESTORE_PATH.")
	}
	return utils.Internal(message, err)
}

func (s *BackupService) audit(ctx context.Context, actor *middlewares.ActorContext, action, reason, ip, ua string, changes any) {
	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "backups", Action: action, Reason: reason, Changes: changes,
		IPAddress: ip, UserAgent: ua,
	})
}

func reasonOrDefault(reason, fallback string) string {
	if reason != "" {
		return reason
	}
	return fallback
}

func toResponse(e repositories.BackupEntity, latest bool) dtos.BackupResponse {
	return dtos.BackupResponse{
		ID: e.ID, FileName: e.ID + ".dump", SizeBytes: e.SizeBytes, Kind: dtos.BackupKind(e.Kind), Note: e.Note,
		CreatedByType: e.CreatedByType, CreatedByEmail: e.CreatedByEmail, CreatedAt: e.CreatedAt, IsLatest: latest,
	}
}
