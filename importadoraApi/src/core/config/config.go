package config

import "time"

// Config centraliza la configuración de entorno del servidor Go y PostgreSQL (solo datos).
type Config struct {
	AppEnv             string
	AppPort            string
	DBHost             string
	DBPort             int
	DBName             string
	DBUser             string
	DBPassword         string
	DBSSLMode          string
	DBMaxConns         int32
	DBMinConns         int32
	JWTSecret          string
	JWTAccessTTL       time.Duration
	JWTRefreshTTL      time.Duration
	LoginMaxAttempts   int
	LoginBlockDuration time.Duration
	CORSAllowedOrigins []string
	UploadsDir         string
}
