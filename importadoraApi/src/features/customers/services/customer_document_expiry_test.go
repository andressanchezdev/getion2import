package services

// customer_document_expiry_test · pruebas de la vigencia de los documentos del cliente
// conecta con: customer_document_expiry (documentExpiry)

import (
	"testing"
	"time"
)

// TestDocumentExpiry revisa el estado y los días que faltan según la fecha de subida y los meses de vigencia.
func TestDocumentExpiry(t *testing.T) {
	now := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name         string
		uploaded     time.Time
		months       int
		wantStatus   string
		wantDaysLeft func(int) bool
	}{
		{"vigente", now.AddDate(0, -2, 0), 12, DocStatusValid, func(d int) bool { return d > DocExpiringSoonDays }},
		{"vence pronto", now.AddDate(0, -12, 10), 12, DocStatusExpiring, func(d int) bool { return d >= 0 && d <= DocExpiringSoonDays }},
		{"vencido", now.AddDate(0, -14, 0), 12, DocStatusExpired, func(d int) bool { return d < 0 }},
		{"vigencia en cero usa 12 meses", now.AddDate(0, -2, 0), 0, DocStatusValid, func(d int) bool { return d > DocExpiringSoonDays }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			expiresAt, status, daysLeft := documentExpiry(c.uploaded, c.months, now)
			if status != c.wantStatus {
				t.Fatalf("estado = %s, quería %s", status, c.wantStatus)
			}
			if !c.wantDaysLeft(daysLeft) {
				t.Fatalf("días que faltan = %d, no es lo esperado para %s", daysLeft, c.name)
			}
			if expiresAt.Before(c.uploaded) {
				t.Fatalf("el vencimiento %v quedó antes de la subida %v", expiresAt, c.uploaded)
			}
		})
	}
}
