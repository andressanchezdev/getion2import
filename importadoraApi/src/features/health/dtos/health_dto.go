package dtos

// health_dto.go · formas de lo que entra y sale por la API en salud del servicio (peticiones y respuestas)
// conecta con: los controllers y services de salud del servicio

type HealthResponse struct {
	Status      string `json:"status"`
	Service     string `json:"service"`
	Environment string `json:"environment"`
	DBLatencyMs int64  `json:"dbLatencyMs"`
	Timestamp   string `json:"timestamp"`
}

type ReadinessResponse struct {
	Ready         bool   `json:"ready"`
	Database      string `json:"database"`
	DBLatencyMs   int64  `json:"dbLatencyMs"`
	TotalConns    int32  `json:"totalConns"`
	IdleConns     int32  `json:"idleConns"`
	AcquiredConns int32  `json:"acquiredConns"`
	Timestamp     string `json:"timestamp"`
}

