package services

import (
	"context"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/features/health/dtos"
)

type HealthService struct {
	cfg      *config.Config
	database *db.Database
}

func NewHealthService(cfg *config.Config, database *db.Database) *HealthService {
	return &HealthService{cfg: cfg, database: database}
}

func (s *HealthService) Check(ctx context.Context) (*dtos.HealthResponse, error) {
	latency, err := s.database.PingLatency(ctx)
	if err != nil {
		return nil, err
	}
	return &dtos.HealthResponse{
		Status:      "online",
		Service:     "importadoraApi",
		Environment: s.cfg.AppEnv,
		DBLatencyMs: latency.Milliseconds(),
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *HealthService) Readiness(ctx context.Context) (*dtos.ReadinessResponse, error) {
	latency, err := s.database.PingLatency(ctx)
	if err != nil {
		return nil, err
	}

	stats := s.database.SQL.Stats()

	return &dtos.ReadinessResponse{
		Ready:         true,
		Database:      s.cfg.DBName,
		DBLatencyMs:   latency.Milliseconds(),
		TotalConns:    int32(stats.OpenConnections),
		IdleConns:     int32(stats.Idle),
		AcquiredConns: int32(stats.InUse),
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	}, nil
}

