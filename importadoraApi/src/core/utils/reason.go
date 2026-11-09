package utils

// reason.go · reglas del motivo obligatorio (10 a 100 caracteres) al desactivar, eliminar, anular o restaurar
// conecta con: los services de personal, compañías, catálogo, bodegas, productos, ventas y respaldos; el motivo queda en la auditoría

import "strings"

// ValidateReason limpia el motivo de una inactivación y exige entre 10 y 100 caracteres.
func ValidateReason(reason string) (string, error) {
	reason = strings.TrimSpace(reason)
	n := len([]rune(reason))
	if n < 10 || n > 100 {
		return "", BadRequest("INVALID_REASON", "El motivo debe tener entre 10 y 100 caracteres.")
	}
	return reason, nil
}

// ReasonOnDeactivation exige el motivo cuando una edición pasa un registro de activo a inactivo; en cualquier otro caso devuelve "".
// ojo: cierra el atajo de desactivar por PUT sin pasar por el motivo obligatorio del DELETE
func ReasonOnDeactivation(wasActive bool, newActive *bool, reason string) (string, error) {
	if !wasActive || newActive == nil || *newActive {
		return "", nil
	}
	return ValidateReason(reason)
}

// ReasonOrDefault devuelve el motivo si lo hay; si no, el texto por defecto.
func ReasonOrDefault(reason, fallback string) string {
	if reason != "" {
		return reason
	}
	return fallback
}
