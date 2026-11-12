package config

// loader.go · carga la configuración de la API desde el entorno al arrancar
// conecta con: env.go (lee las variables) y validators.go (revisa que estén completas); lo llama main.go

import (
	"fmt"
	"time"

	"github.com/joho/godotenv"
)

// Load carga el archivo .env (si existe), parsea las variables y orquesta la validación del struct Config.
func Load() (*Config, error) {
	_ = godotenv.Load(".env", "../.env", "../../.env", "../../../.env")

	dbPort, err := envInt("DB_PORT", 5432)
	if err != nil {
		return nil, fmt.Errorf("DB_PORT inválido: %w", err)
	}

	maxConns, err := envInt("DB_MAX_CONNS", 20)
	if err != nil {
		return nil, fmt.Errorf("DB_MAX_CONNS inválido: %w", err)
	}

	minConns, err := envInt("DB_MIN_CONNS", 2)
	if err != nil {
		return nil, fmt.Errorf("DB_MIN_CONNS inválido: %w", err)
	}

	accessMin, err := envInt("JWT_ACCESS_TTL_MIN", 30)
	if err != nil {
		return nil, fmt.Errorf("JWT_ACCESS_TTL_MIN inválido: %w", err)
	}

	refreshDays, err := envInt("JWT_REFRESH_TTL_DAYS", 7)
	if err != nil {
		return nil, fmt.Errorf("JWT_REFRESH_TTL_DAYS inválido: %w", err)
	}

	maxAttempts, err := envInt("LOGIN_MAX_ATTEMPTS", 5)
	if err != nil {
		return nil, fmt.Errorf("LOGIN_MAX_ATTEMPTS inválido: %w", err)
	}

	blockMinutes, err := envInt("LOGIN_BLOCK_MINUTES", 15)
	if err != nil {
		return nil, fmt.Errorf("LOGIN_BLOCK_MINUTES inválido: %w", err)
	}

	cfg := &Config{
		AppEnv:             envStr("APP_ENV", "development"),
		AppPort:            envStr("APP_PORT", envStr("PORT", "8080")),
		DBHost:             envStr("DB_HOST", "localhost"),
		DBPort:             dbPort,
		DBName:             envStr("DB_DATABASE", ""),
		DBUser:             envStr("DB_USER", ""),
		DBPassword:         envStr("DB_PASSWORD", ""),
		DBSSLMode:          envStr("DB_SSLMODE", "disable"),
		DBMaxConns:         int32(maxConns),
		DBMinConns:         int32(minConns),
		JWTSecret:          envStr("JWT_SECRET", "importadora_v4_secret_key_dev_2026_secure"),
		JWTAccessTTL:       time.Duration(accessMin) * time.Minute,
		JWTRefreshTTL:      time.Duration(refreshDays) * 24 * time.Hour,
		LoginMaxAttempts:   maxAttempts,
		LoginBlockDuration: time.Duration(blockMinutes) * time.Minute,
		CORSAllowedOrigins: parseCSV(envStr("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
		UploadsDir:         envStr("UPLOADS_DIR", "./uploads"),
		BackupsDir:         envStr("BACKUPS_DIR", "./backups"),
		PgDumpPath:         envStr("PG_DUMP_PATH", "pg_dump"),
		PgRestorePath:      envStr("PG_RESTORE_PATH", "pg_restore"),
	}

	ticketSec, err := envInt("REALTIME_TICKET_TTL_SEC", 30)
	if err != nil {
		return nil, err
	}
	eventsEnabled, err := envBool("REALTIME_EVENTS_ENABLED", true)
	if err != nil {
		return nil, err
	}
	cfg.RealtimeEventsEnabled = eventsEnabled
	cfg.RealtimeTicketTTL = time.Duration(ticketSec) * time.Second
	cfg.RealtimeWSURL = envStr("REALTIME_WS_URL", "")

	if err := Validate(cfg); err != nil {
		return nil, fmt.Errorf("error de validación en configuración: %w", err)
	}

	return cfg, nil
}
