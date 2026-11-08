package repositories

// backup_pg_repo.go · corre pg_dump y pg_restore contra la base de datos de la configuración
// conecta con: BackupService (genera y restaura los .dump); usa la configuración (conexión y ruta de los ejecutables)
// ojo: la contraseña viaja por variable de entorno (PGPASSWORD), nunca en los argumentos, para que no se vea en la lista de procesos

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"importadoraApi/src/core/config"
)

// ErrPgToolMissing se devuelve cuando pg_dump o pg_restore no están instalados donde el servidor corre.
var ErrPgToolMissing = errors.New("herramienta de PostgreSQL no encontrada")

type PgToolsRepository struct {
	cfg *config.Config
}

// NewPgToolsRepository crea el repositorio con la configuración de conexión.
func NewPgToolsRepository(cfg *config.Config) *PgToolsRepository {
	return &PgToolsRepository{cfg: cfg}
}

// Dump escribe en destPath una copia completa de la base en formato personalizado (comprimido).
func (r *PgToolsRepository) Dump(ctx context.Context, destPath string) error {
	return r.run(ctx, r.cfg.PgDumpPath, append(r.connArgs(), "-Fc", "--no-owner", "--no-privileges", "-f", destPath))
}

// Restore reemplaza el contenido de la base por el del .dump, todo en una sola transacción (si falla, queda como estaba).
func (r *PgToolsRepository) Restore(ctx context.Context, srcPath string) error {
	return r.run(ctx, r.cfg.PgRestorePath, append(r.connArgs(),
		"--clean", "--if-exists", "--no-owner", "--no-privileges", "--single-transaction", "--exit-on-error", srcPath))
}

func (r *PgToolsRepository) connArgs() []string {
	return []string{"-h", r.cfg.DBHost, "-p", strconv.Itoa(r.cfg.DBPort), "-U", r.cfg.DBUser, "-d", r.cfg.DBName}
}

func (r *PgToolsRepository) run(ctx context.Context, bin string, args []string) error {
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = append(os.Environ(),
		"PGPASSWORD="+r.cfg.DBPassword,
		"PGSSLMODE="+r.cfg.DBSSLMode,
		"PGOPTIONS=-c lock_timeout=30s",
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return fmt.Errorf("%w: %s", ErrPgToolMissing, bin)
		}
		detail := strings.TrimSpace(stderr.String())
		if len(detail) > 600 {
			detail = detail[len(detail)-600:]
		}
		return fmt.Errorf("%s falló: %w: %s", bin, err, detail)
	}
	return nil
}
