package bootstrap

// events_guard_test · la API solo permite transacciones que emitan un evento de tiempo real o que se marquen explícitamente como excepción.
// conecta con: features/*/services y core/events (Record/Stock/CreditBalance/CashSessionTotals). Si un servicio que muta datos se olvida
// de llamar a un helper de realtime, esta prueba falla antes de que un usuario vea datos desactualizados.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var allowedNoRealtimeMutation = map[string]string{
	"audit/services/audit_service.go": "la auditoría interna no afecta el estado del negocio visible en UI; se usa solo para trazabilidad y contexto multiempresa",
}

func TestEveryTxServiceEmitsRealtimeEventOrIsExplicitlyAllowed(t *testing.T) {
	base := filepath.Clean("../../features")
	if err := filepath.WalkDir(base, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		text, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		content := string(text)
		if !strings.Contains(content, "WithTx(") {
			return nil
		}

		rel, err := filepath.Rel(base, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if _, ok := allowedNoRealtimeMutation[rel]; ok {
			return nil
		}

		if strings.Contains(content, "Record(") || strings.Contains(content, "Stock(") || strings.Contains(content, "CreditBalance(") || strings.Contains(content, "CashSessionTotals(") || strings.Contains(content, "CashSessionTotalsOfPayment(") {
			return nil
		}

		t.Errorf("%s usa db.WithTx pero no emite ningún evento de realtime; agrega Record/Stock o marca una excepción explícita", rel)
		return nil
	}); err != nil {
		t.Fatalf("error revisando servicios con transacción: %v", err)
	}
}
