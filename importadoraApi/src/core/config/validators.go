package config

import (
	"fmt"
	"strings"
)

// Validate verifica que los campos obligatorios y restricciones lógicas sean coherentes.
func Validate(cfg *Config) error {
	if cfg == nil {
		return fmt.Errorf("configuración nula")
	}

	if err := validateDatabase(cfg); err != nil {
		return err
	}

	if err := validateSecurity(cfg); err != nil {
		return err
	}

	if err := validateServer(cfg); err != nil {
		return err
	}

	return nil
}

func validateDatabase(cfg *Config) error {
	if strings.TrimSpace(cfg.DBName) == "" {
		return fmt.Errorf("DB_DATABASE es obligatoria")
	}
	if strings.TrimSpace(cfg.DBUser) == "" {
		return fmt.Errorf("DB_USER es obligatorio")
	}
	if cfg.DBPort <= 0 || cfg.DBPort > 65535 {
		return fmt.Errorf("DB_PORT (%d) debe ser un puerto TCP válido entre 1 y 65535", cfg.DBPort)
	}
	if cfg.DBMaxConns < 1 {
		return fmt.Errorf("DB_MAX_CONNS debe ser al menos 1")
	}
	if cfg.DBMinConns < 0 {
		return fmt.Errorf("DB_MIN_CONNS no puede ser negativo")
	}
	if cfg.DBMinConns > cfg.DBMaxConns {
		return fmt.Errorf("DB_MIN_CONNS (%d) no puede ser mayor que DB_MAX_CONNS (%d)", cfg.DBMinConns, cfg.DBMaxConns)
	}
	return nil
}

func validateSecurity(cfg *Config) error {
	if len(strings.TrimSpace(cfg.JWTSecret)) < 16 {
		return fmt.Errorf("JWT_SECRET debe tener al menos 16 caracteres para garantizar seguridad criptográfica")
	}
	if cfg.JWTAccessTTL <= 0 {
		return fmt.Errorf("JWTAccessTTL debe ser mayor a 0")
	}
	if cfg.JWTRefreshTTL <= 0 {
		return fmt.Errorf("JWTRefreshTTL debe ser mayor a 0")
	}
	if cfg.LoginMaxAttempts <= 0 {
		return fmt.Errorf("LoginMaxAttempts debe ser al menos 1")
	}
	return nil
}

func validateServer(cfg *Config) error {
	if strings.TrimSpace(cfg.AppPort) == "" {
		return fmt.Errorf("APP_PORT no puede estar vacío")
	}
	if strings.TrimSpace(cfg.UploadsDir) == "" {
		return fmt.Errorf("UploadsDir no puede estar vacío")
	}
	return nil
}

