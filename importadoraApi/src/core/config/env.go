package config

// env.go · lectura de variables de entorno: texto, números, duraciones y listas, con su valor por defecto
// conecta con: loader.go (las usa para llenar la configuración)

import (
	"fmt"
	"os"
	"strconv"
	"strings"
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

// envBool obtiene una variable de entorno booleana (true/false, 1/0, yes/no) con fallback seguro.
func envBool(key string, fallback bool) (bool, error) {
	val := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	switch val {
	case "":
		return fallback, nil
	case "true", "1", "yes", "si", "sí":
		return true, nil
	case "false", "0", "no":
		return false, nil
	}
	return false, fmt.Errorf("valor de entorno %s no es un booleano válido: %q", key, val)
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
