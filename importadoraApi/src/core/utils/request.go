package utils

import (
	"errors"
	"io"
	"net"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

// BindJSON enlaza el cuerpo JSON de la petición hacia el struct destino con mensajes claros.
func BindJSON(c echo.Context, dst any) error {
	if c.Request().Body == nil {
		return BadRequest("EMPTY_BODY", "El cuerpo de la solicitud es obligatorio.")
	}
	if err := c.Bind(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return BadRequest("EMPTY_BODY", "El cuerpo JSON no puede estar vacío.")
		}
		return BadRequest("INVALID_JSON", "El formato JSON enviado es inválido.")
	}
	return nil
}

// BindOptionalJSON permite peticiones sin body o con body opcional (ej. logout).
func BindOptionalJSON(c echo.Context, dst any) error {
	if c.Request().Body == nil {
		return nil
	}
	if err := c.Bind(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return BadRequest("INVALID_JSON", "El formato JSON enviado es inválido.")
	}
	return nil
}

// ParamInt64 extrae y valida un parámetro numérico positivo desde la ruta URL (:id).
func ParamInt64(c echo.Context, param string) (int64, error) {
	raw := strings.TrimSpace(c.Param(param))
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, BadRequest("INVALID_ID", "El identificador '"+param+"' debe ser un entero positivo.")
	}
	return id, nil
}

// EchoClientIP obtiene la IP real del cliente usando las capacidades nativas de Echo.
func EchoClientIP(c echo.Context) string {
	ip := c.RealIP()
	if ip == "" {
		host, _, err := net.SplitHostPort(strings.TrimSpace(c.Request().RemoteAddr))
		if err == nil && host != "" {
			return host
		}
		return strings.TrimSpace(c.Request().RemoteAddr)
	}
	return ip
}
