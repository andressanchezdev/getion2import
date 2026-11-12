package utils

import (
	"strings"
	"time"
)

// ValidateExpectedVersion valida la versión optimista comparando la marca de tiempo actual del registro con la esperada.
func ValidateExpectedVersion(currentUpdatedAt time.Time, expectedVersion *string) error {
	if expectedVersion == nil || strings.TrimSpace(*expectedVersion) == "" {
		return nil
	}

	expected := strings.TrimSpace(*expectedVersion)
	parsed, err := time.Parse(time.RFC3339Nano, expected)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, expected)
		if err != nil {
			return BadRequest("INVALID_EXPECTED_VERSION", "expectedVersion debe ser un ISO-8601 válido.")
		}
	}
	if !currentUpdatedAt.UTC().Equal(parsed.UTC()) {
		return StaleVersion("El registro cambió desde que se abrió para editarlo.", currentUpdatedAt.Format(time.RFC3339Nano))
	}
	return nil
}
