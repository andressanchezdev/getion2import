package utils

// errors_db_test · NormalizeDBError: duplicados con mensaje legible, llaves foráneas, CHECK, nulos y registros inexistentes
// conecta con: errors.go (NormalizeDBError y duplicateMessage)

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func asApp(t *testing.T, err error) *AppError {
	t.Helper()
	var appErr *AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("se esperaba AppError y llegó %v", err)
	}
	return appErr
}

func TestNormalizeDBErrorDuplicates(t *testing.T) {
	cases := []struct{ constraint, contains string }{
		{"idx_uq_employees_company_doc", "empleado con ese número de documento"},
		{"idx_uq_externals_company_kind_doc", "proveedor o transportadora con ese tipo y número de documento"},
		{"customers_company_id_document_key", "cliente con ese documento"},
		{"warehouses_company_id_code_key", "bodega con ese código"},
		{"alguna_restriccion_nueva", "alguna_restriccion_nueva"},
	}
	for _, c := range cases {
		appErr := asApp(t, NormalizeDBError(&pgconn.PgError{Code: "23505", ConstraintName: c.constraint}, ""))
		if appErr.Status != http.StatusConflict || appErr.Code != "DUPLICATE_RECORD" {
			t.Errorf("%s: %d %s", c.constraint, appErr.Status, appErr.Code)
		}
		if !contains(appErr.Message, c.contains) {
			t.Errorf("%s: el mensaje %q no contiene %q", c.constraint, appErr.Message, c.contains)
		}
	}
}

func TestNormalizeDBErrorOtherViolations(t *testing.T) {
	if got := asApp(t, NormalizeDBError(&pgconn.PgError{Code: "23503", ConstraintName: "fk"}, "")); got.Status != http.StatusConflict {
		t.Errorf("FK: %d", got.Status)
	}
	if got := asApp(t, NormalizeDBError(&pgconn.PgError{Code: "23514", ConstraintName: "chk"}, "")); got.Status != http.StatusUnprocessableEntity {
		t.Errorf("CHECK: %d", got.Status)
	}
	if got := asApp(t, NormalizeDBError(&pgconn.PgError{Code: "23502", ColumnName: "name"}, "")); got.Status != http.StatusBadRequest {
		t.Errorf("NOT NULL: %d", got.Status)
	}
	if got := asApp(t, NormalizeDBError(fmt.Errorf("envuelto: %w", pgx.ErrNoRows), "El cliente no existe.")); got.Status != http.StatusNotFound || got.Message != "El cliente no existe." {
		t.Errorf("sin filas: %d %q", got.Status, got.Message)
	}
	if got := asApp(t, NormalizeDBError(errors.New("falla rara"), "")); got.Status != http.StatusInternalServerError {
		t.Errorf("desconocido: %d", got.Status)
	}
	if NormalizeDBError(nil, "") != nil {
		t.Error("nil debe seguir siendo nil")
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
