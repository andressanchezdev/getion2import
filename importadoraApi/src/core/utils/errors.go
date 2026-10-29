package utils

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// AppError representa un error de negocio o infraestructura con código HTTP real.
type AppError struct {
	Status  int
	Code    string
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func BadRequest(code, message string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Code: code, Message: message}
}

func Unauthorized(code, message string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Code: code, Message: message}
}

func Forbidden(code, message string) *AppError {
	return &AppError{Status: http.StatusForbidden, Code: code, Message: message}
}

func NotFound(code, message string) *AppError {
	return &AppError{Status: http.StatusNotFound, Code: code, Message: message}
}

func Conflict(code, message string) *AppError {
	return &AppError{Status: http.StatusConflict, Code: code, Message: message}
}

func Unprocessable(code, message string) *AppError {
	return &AppError{Status: http.StatusUnprocessableEntity, Code: code, Message: message}
}

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
			return Conflict("DUPLICATE_RECORD", "Ya existe un registro con los mismos datos únicos ("+pgErr.ConstraintName+").")
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
