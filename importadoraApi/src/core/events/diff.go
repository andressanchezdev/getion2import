package events

// diff.go · dice qué campos cambiaron en una edición, para el changedFields de entity.updated
// conecta con: los servicios de datos maestros (toman la foto al leer el registro y la comparan con lo guardado) y E10 (aviso «Ana cambió teléfono y ciudad»)
// ojo: solo viajan los NOMBRES de los campos, nunca sus valores; las fechas de control (createdAt, updatedAt) no cuentan como cambio

import (
	"bytes"
	"encoding/json"
	"sort"
	"unicode"
)

// Snapshot guarda el estado de un registro (sus campos exportados) antes de editarlo.
func Snapshot(v any) map[string]json.RawMessage {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	out := map[string]json.RawMessage{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}

// ChangedFields compara la foto anterior con el registro ya guardado y devuelve los campos distintos, en orden alfabético.
func ChangedFields(before map[string]json.RawMessage, after any) []string {
	now := Snapshot(after)
	changed := make([]string, 0)
	for name, value := range now {
		if ignoredField[name] {
			continue
		}
		if prev, ok := before[name]; !ok || !bytes.Equal(prev, value) {
			changed = append(changed, fieldName(name))
		}
	}
	sort.Strings(changed)
	return changed
}

var ignoredField = map[string]bool{"UpdatedAt": true, "CreatedAt": true, "updatedAt": true, "createdAt": true}

// fieldName pasa el nombre del campo de Go (Phone, CreditLimit) al del JSON de la API (phone, creditLimit); las siglas iniciales bajan completas (IVA → iva, ID → id).
func fieldName(name string) string {
	runes := []rune(name)
	for i, r := range runes {
		if !unicode.IsUpper(r) {
			break
		}
		if i > 0 && i+1 < len(runes) && unicode.IsLower(runes[i+1]) {
			break
		}
		runes[i] = unicode.ToLower(r)
	}
	return string(runes)
}
