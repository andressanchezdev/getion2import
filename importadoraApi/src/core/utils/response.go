package utils

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// PaginatorMetadata sigue exactamente el contrato estándar de paginación del cliente.
type PaginatorMetadata struct {
	CurrentPage  int  `json:"currentPage"`
	PageSize     int  `json:"pageSize"`
	TotalRecords int  `json:"totalRecords"`
	TotalPages   int  `json:"totalPages"`
	HasNextPage  bool `json:"hasNextPage"`
	HasPrevPage  bool `json:"hasPrevPage"`
}

// SuccessResponse garantiza que "data" siempre viaje explícito en respuestas 2xx.
type SuccessResponse[T any] struct {
	Success bool               `json:"success"`
	Message string             `json:"message"`
	Data    T                  `json:"data"`
	Meta    *PaginatorMetadata `json:"meta,omitempty"`
}

// ErrorResponse representa cualquier respuesta HTTP >= 400 (nunca HTTP 200 con success:false).
type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// PageParams contiene los parámetros validados para consultas SQL con LIMIT y OFFSET.
type PageParams struct {
	Page     int
	PageSize int
	Offset   int
}

// ParsePagination extrae page y pageSize usando Echo Context con valores seguros por defecto.
func ParsePagination(c echo.Context) PageParams {
	page := queryInt(c, "page", 1)
	if page < 1 {
		page = 1
	}
	pageSize := queryInt(c, "pageSize", 30)
	if pageSize < 1 {
		pageSize = 30
	}
	if pageSize > 200 {
		pageSize = 200
	}
	return PageParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   (page - 1) * pageSize,
	}
}

// BuildMeta calcula los metadatos de paginación a partir del total real en base de datos.
func BuildMeta(page, pageSize, totalRecords int) PaginatorMetadata {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 30
	}
	totalPages := 0
	if totalRecords > 0 {
		totalPages = (totalRecords + pageSize - 1) / pageSize
	}
	return PaginatorMetadata{
		CurrentPage:  page,
		PageSize:     pageSize,
		TotalRecords: totalRecords,
		TotalPages:   totalPages,
		HasNextPage:  page < totalPages,
		HasPrevPage:  page > 1 && totalPages > 0,
	}
}

func RespondOK[T any](c echo.Context, message string, data T) error {
	return c.JSON(http.StatusOK, SuccessResponse[T]{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func RespondCreated[T any](c echo.Context, message string, data T) error {
	return c.JSON(http.StatusCreated, SuccessResponse[T]{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// RespondPaginated garantiza que items nunca se serialice como null (siempre [] cuando está vacío).
func RespondPaginated[T any](c echo.Context, message string, items []T, meta PaginatorMetadata) error {
	if items == nil {
		items = make([]T, 0)
	}
	return c.JSON(http.StatusOK, SuccessResponse[[]T]{
		Success: true,
		Message: message,
		Data:    items,
		Meta:    &meta,
	})
}

func RespondNoContent(c echo.Context) error {
	return c.NoContent(http.StatusNoContent)
}

// EchoErrorHandler maneja de forma centralizada cualquier error en Echo devolviendo el contrato ErrorResponse.
func EchoErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	var appErr *AppError
	if errors.As(err, &appErr) {
		detail := appErr.Code
		if detail == "" && appErr.Err != nil {
			detail = appErr.Err.Error()
		}
		_ = c.JSON(appErr.Status, ErrorResponse{
			Success: false,
			Message: appErr.Message,
			Error:   detail,
		})
		return
	}

	var he *echo.HTTPError
	if errors.As(err, &he) {
		msg := "Ocurrió un error en la solicitud."
		if m, ok := he.Message.(string); ok && m != "" {
			msg = m
		}
		_ = c.JSON(he.Code, ErrorResponse{
			Success: false,
			Message: msg,
			Error:   http.StatusText(he.Code),
		})
		return
	}

	_ = c.JSON(http.StatusInternalServerError, ErrorResponse{
		Success: false,
		Message: "Ocurrió un error interno inesperado en el servidor.",
		Error:   "INTERNAL_SERVER_ERROR",
	})
}

func queryInt(c echo.Context, key string, fallback int) int {
	raw := c.QueryParam(key)
	if raw == "" {
		return fallback
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return val
}
