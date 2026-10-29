package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// envStr obtiene una variable de entorno como string o retorna un valor por defecto si está vacía.
func envStr(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

// envInt obtiene una variable de entorno convertida a entero con fallback seguro.
func envInt(key string, fallback int) (int, error) {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback, nil
	}
	res, err := strconv.Atoi(val)
	if err != nil {
		return 0, fmt.Errorf("valor de entorno %s no es un entero válido: %w", key, err)
	}
	return res, nil
}

// envDuration obtiene una variable de entorno parseable como time.Duration o retorna el fallback.
func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback, nil
	}
	res, err := time.ParseDuration(val)
	if err != nil {
		return 0, fmt.Errorf("valor de entorno %s no es una duración válida: %w", key, err)
	}
	return res, nil
}

// parseCSV divide una cadena delimitada por comas en un slice de cadenas limpias.
func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	return out
}
