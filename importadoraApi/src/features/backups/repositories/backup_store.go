package repositories

// backup_store.go · guarda y lee los respaldos como archivos en una carpeta (el .dump y un .json con quién lo hizo y cuándo)
// conecta con: BackupService (lo usa para listar, guardar y abrir respaldos); la carpeta viene de la configuración (BACKUPS_DIR)
// ojo: los datos del respaldo NO van en la base: restaurar la base los borraría; la carpeta es la fuente de verdad

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// BackupEntity es un respaldo guardado en disco.
type BackupEntity struct {
	ID             string    `json:"id"`
	Kind           string    `json:"kind"`
	Note           string    `json:"note"`
	CreatedByType  string    `json:"createdByType"`
	CreatedByID    int64     `json:"createdById"`
	CreatedByEmail string    `json:"createdByEmail"`
	CreatedAt      time.Time `json:"createdAt"`
	SizeBytes      int64     `json:"-"` // sale del tamaño real del archivo
}

// ErrBackupNotFound se devuelve cuando el respaldo no existe en la carpeta.
var ErrBackupNotFound = errors.New("respaldo no encontrado")

// el id solo puede ser fecha-hora-tipo: así nunca se arma una ruta fuera de la carpeta de respaldos
var backupIDPattern = regexp.MustCompile(`^[0-9]{8}-[0-9]{6}-(manual|pre_restore)$`)

// ValidBackupID dice si el texto tiene la forma de un id de respaldo.
func ValidBackupID(id string) bool { return backupIDPattern.MatchString(id) }

type BackupStore struct {
	dir string
}

// NewBackupStore crea el almacén sobre una carpeta (se crea si no existe al guardar).
func NewBackupStore(dir string) *BackupStore { return &BackupStore{dir: dir} }

// NewID arma un id nuevo con la hora (en UTC) y el tipo.
func (s *BackupStore) NewID(kind string, now time.Time) string {
	return fmt.Sprintf("%s-%s", now.UTC().Format("20060102-150405"), kind)
}

// DumpPath es la ruta del archivo .dump de un respaldo.
func (s *BackupStore) DumpPath(id string) string { return filepath.Join(s.dir, id+".dump") }

// PartialPath es la ruta temporal donde se escribe el .dump mientras se genera.
func (s *BackupStore) PartialPath(id string) string { return s.DumpPath(id) + ".partial" }

func (s *BackupStore) metaPath(id string) string { return filepath.Join(s.dir, id+".json") }

// EnsureDir crea la carpeta de respaldos si no existe.
func (s *BackupStore) EnsureDir() error { return os.MkdirAll(s.dir, 0o750) }

// Commit publica el respaldo: renombra el .dump temporal a definitivo y escribe su .json.
func (s *BackupStore) Commit(meta BackupEntity) error {
	if err := os.Rename(s.PartialPath(meta.ID), s.DumpPath(meta.ID)); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.metaPath(meta.ID), raw, 0o640)
}

// DiscardPartial borra el .dump temporal de un respaldo que falló.
func (s *BackupStore) DiscardPartial(id string) { _ = os.Remove(s.PartialPath(id)) }

// Find devuelve un respaldo por id.
func (s *BackupStore) Find(id string) (*BackupEntity, error) {
	if !ValidBackupID(id) {
		return nil, ErrBackupNotFound
	}
	raw, err := os.ReadFile(s.metaPath(id))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrBackupNotFound
		}
		return nil, err
	}
	var meta BackupEntity
	if err := json.Unmarshal(raw, &meta); err != nil {
		return nil, err
	}
	info, err := os.Stat(s.DumpPath(id))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrBackupNotFound
		}
		return nil, err
	}
	meta.ID = id
	meta.SizeBytes = info.Size()
	return &meta, nil
}

// List devuelve todos los respaldos, del más nuevo al más viejo (los incompletos se ignoran).
func (s *BackupStore) List() ([]BackupEntity, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []BackupEntity{}, nil
		}
		return nil, err
	}
	items := make([]BackupEntity, 0, len(entries))
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".json") {
			continue
		}
		meta, err := s.Find(strings.TrimSuffix(name, ".json"))
		if err != nil {
			continue
		}
		items = append(items, *meta)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.After(items[j].CreatedAt) })
	return items, nil
}
