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
	BackupsDir         string // carpeta donde se guardan los respaldos de la base
	PgDumpPath         string // ejecutable de pg_dump (por defecto el del PATH)
	PgRestorePath      string // ejecutable de pg_restore (por defecto el del PATH)

	// tiempo real (importadoraRealtime/PLAN-WEBSOCKET.md)
	RealtimeEventsEnabled bool          // REALTIME_EVENTS_ENABLED: guardar eventos del websocket (interruptor para desplegar o volver atrás)
	RealtimeTicketTTL     time.Duration // REALTIME_TICKET_TTL_SEC: vida del ticket de un solo uso para abrir el websocket (10–120 s)
	RealtimeWSURL         string        // REALTIME_WS_URL: dirección del websocket que se devuelve con el ticket (obligatoria en producción)
}
