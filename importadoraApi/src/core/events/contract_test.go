package events

// contract_test · los structs de types.go coinciden campo por campo con el contrato v1 (importadoraRealtime/contract/examples)
// conecta con: types.go (bodies) y los 48 ejemplos del contrato; si alguien cambia un campo en un solo lado, esta prueba falla
// ojo: decodifica cada `data` con DisallowUnknownFields (no sobra nada) y lo vuelve a codificar (no falta nada)

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

const contractExamples = "../../../../importadoraRealtime/contract/examples"

func TestStructsMatchContractExamples(t *testing.T) {
	files, err := filepath.Glob(filepath.Join(contractExamples, "*.json"))
	if err != nil || len(files) != expectedTypes {
		t.Fatalf("se esperaban %d ejemplos en %s; hay %d (%v)", expectedTypes, contractExamples, len(files), err)
	}
	for _, file := range files {
		eventType := Type(strings.TrimSuffix(filepath.Base(file), ".json"))
		t.Run(string(eventType), func(t *testing.T) {
			raw, err := os.ReadFile(file)
			if err != nil {
				t.Fatal(err)
			}
			var envelope struct {
				Type Type            `json:"type"`
				Data json.RawMessage `json:"data"`
			}
			if err := json.Unmarshal(raw, &envelope); err != nil {
				t.Fatal(err)
			}
			newBody, ok := bodies[envelope.Type]
			if !ok {
				t.Fatalf("el contrato tiene %s y types.go no", envelope.Type)
			}
			body := newBody()
			dec := json.NewDecoder(bytes.NewReader(envelope.Data))
			dec.DisallowUnknownFields()
			if err := dec.Decode(body); err != nil {
				t.Fatalf("data no encaja en %T: %v", body, err)
			}
			again, err := json.Marshal(body)
			if err != nil {
				t.Fatal(err)
			}
			var want, got any
			_ = json.Unmarshal(envelope.Data, &want)
			_ = json.Unmarshal(again, &got)
			if !reflect.DeepEqual(normalize(want), normalize(got)) {
				t.Fatalf("al volver a codificar %T cambió el cuerpo:\n contrato: %s\n struct:   %s", body, envelope.Data, again)
			}
		})
	}
}

// normalize compara fechas por su instante (Go escribe 15:04:05.12004Z donde el ejemplo dice 15:04:05.120040Z)
func normalize(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := map[string]any{}
		for k, val := range x {
			out[k] = normalize(val)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, val := range x {
			out[i] = normalize(val)
		}
		return out
	case string:
		if ts, err := time.Parse(time.RFC3339Nano, x); err == nil {
			return ts.UTC().Format(time.RFC3339Nano)
		}
	}
	return v
}
