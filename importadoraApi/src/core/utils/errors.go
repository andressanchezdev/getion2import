package utils

// errors.go · AppError: errores con código HTTP y mensaje listo para el cliente
// conecta con: todos los services (los crean) y controllers (los devuelven)

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// AppError representa un error de negocio o infraestructura con código HTTP real.
type AppError struct {
	Status  int
	Code    string
	Message string
	Details any
	Err     error
}

// Error devuelve el mensaje del error para que cumpla la interfaz error.
func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

// Unwrap devuelve el error original que causó este, para poder revisarlo con errors.Is y errors.As.
func (e *AppError) Unwrap() error {
	return e.Err
}

// BadRequest crea un error 400: la petición es inválida.
func BadRequest(code, message string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Code: code, Message: message}
}

// Unauthorized crea un error 401: falta iniciar sesión o el token no sirve.
func Unauthorized(code, message string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Code: code, Message: message}
}

// Forbidden crea un error 403: no tiene permiso para esto.
func Forbidden(code, message string) *AppError {
	return &AppError{Status: http.StatusForbidden, Code: code, Message: message}
}

// NotFound crea un error 404: el recurso no existe.
func NotFound(code, message string) *AppError {
	return &AppError{Status: http.StatusNotFound, Code: code, Message: message}
}

// Conflict crea un error 409: choca con algo que ya existe.
func Conflict(code, message string) *AppError {
	return &AppError{Status: http.StatusConflict, Code: code, Message: message}
}

// StaleVersion crea un error 409 de versión desactualizada para competencias optimistas.
func StaleVersion(message string, currentVersion any) *AppError {
	return &AppError{Status: http.StatusConflict, Code: "STALE_VERSION", Message: message, Details: map[string]any{"currentVersion": currentVersion}}
}

// Unprocessable crea un error 422: los datos llegaron bien pero el negocio no los acepta.
func Unprocessable(code, message string) *AppError {
	return &AppError{Status: http.StatusUnprocessableEntity, Code: code, Message: message}
}

// TooManyRequests crea un error 429: se pasó del límite de peticiones permitidas.
func TooManyRequests(code, message string) *AppError {
	return &AppError{Status: http.StatusTooManyRequests, Code: code, Message: message}
}

// Internal crea un error 500: falla inesperada, con el error original adentro.
func Internal(message string, err error) *AppError {
	return &AppError{Status: http.StatusInternalServerError, Code: "INTERNAL_ERROR", Message: message, Err: err}
}

// NormalizeDBError traduce errores comunes de PostgreSQL / pgx a AppError semánticos.
func NormalizeDBError(err error, notFoundMsg string) error {
	if err == nil {
		return nil
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	if errors.Is(err, pgx.ErrNoRows) {
		if notFoundMsg == "" {
			notFoundMsg = "El registro solicitado no existe."
		}
		return NotFound("RESOURCE_NOT_FOUND", notFoundMsg)
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return Conflict("DUPLICATE_RECORD", duplicateMessage(pgErr.ConstraintName))
		case "23503": // foreign_key_violation
			return Conflict("FOREIGN_KEY_CONSTRAINT", "La operación referencia un registro inexistente o protegido ("+pgErr.ConstraintName+").")
		case "23514": // check_violation
			return Unprocessable("CHECK_CONSTRAINT_VIOLATION", "Uno o más valores incumplen las reglas de integridad ("+pgErr.ConstraintName+").")
		case "23502": // not_null_violation
			return BadRequest("MISSING_REQUIRED_FIELD", "Falta un campo obligatorio ("+pgErr.ColumnName+").")
		}
	}

	return Internal("Error interno al procesar la operación en base de datos.", err)
}

// duplicateMessage dice qué dato se repite según la restricción única que saltó; sin una conocida, nombra la restricción
func duplicateMessage(constraint string) string {
	known := []struct{ part, message string }{
		{"employees_company_doc", "Ya existe un empleado con ese número de documento."},
		{"employees_email", "Ya existe un empleado con ese correo."},
		{"externals_company_kind_doc", "Ya existe un proveedor o transportadora con ese tipo y número de documento."},
		{"externals", "Ya existe un proveedor o transportadora con ese nombre."},
		{"customers_company_id_document", "Ya existe un cliente con ese documento."},
		{"customers", "Ya existe un cliente con esos datos."},
		{"warehouses_company_id_code", "Ya existe una bodega con ese código."},
		{"roles", "Ya existe un rol con ese código."},
		{"categories", "Ya existe una categoría con ese nombre en el mismo nivel."},
		{"products_company_id_code", "Ya existe un producto con ese código."},
	}
	for _, k := range known {
		if strings.Contains(constraint, k.part) {
			return k.message
		}
	}
	return "Ya existe un registro con los mismos datos únicos (" + constraint + ")."
}
