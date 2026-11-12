package server

// server.go · servidor HTTP: configuración de Echo, arranque y apagado ordenado
// conecta con: core/config y core/bootstrap (el enrutador); lo llama main.go

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Server struct {
	echo *echo.Echo
	cfg  *config.Config
}

// NewServer crea el servidor HTTP con su configuración y su enrutador.
func NewServer(cfg *config.Config) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HTTPErrorHandler = utils.EchoErrorHandler

	// Middlewares globales estándar
	e.Use(middleware.Recover())
	// id de cada petición (cabecera X-Request-ID): se responde al cliente y viaja como correlationId de los eventos del websocket
	e.Use(middleware.RequestIDWithConfig(middleware.RequestIDConfig{
		RequestIDHandler: func(c echo.Context, id string) {
			c.SetRequest(c.Request().WithContext(middlewares.WithRequestID(c.Request().Context(), id)))
		},
	}))
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Level: 5,
	}))
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "${time_rfc3339} | ${status} | ${latency_human} | ${remote_ip} | ${method} ${uri} | ${id}\n",
	}))

	// Configuración de CORS
	origins := []string{"*"}
	if len(cfg.CORSAllowedOrigins) > 0 {
		origins = cfg.CORSAllowedOrigins
	}

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     origins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Requested-With"},
		AllowCredentials: true,
	}))

	// ojo: /uploads ya no se sirve en público (8.2-11); los documentos de clientes salen por GET /customers/:id/documents/:docId/file con sesión y permiso
	_ = os.MkdirAll(cfg.UploadsDir, 0755)

	return &Server{
		echo: e,
		cfg:  cfg,
	}
}

// Start inicia el servidor HTTP escuchando en el puerto configurado con soporte de graceful shutdown.
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%s", s.cfg.AppPort)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		fmt.Printf("Servidor API Go escuchando en http://localhost:%s\n", s.cfg.AppPort)
		if err := s.echo.Start(addr); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		return err
	case sig := <-quit:
		fmt.Printf("\nSeñal recibida (%s). Iniciando apagado seguro del servidor...\n", sig.String())
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return s.echo.Shutdown(ctx)
	}
}

// Echo devuelve la instancia de Echo para el registro de rutas de cada módulo/feature
func (s *Server) Echo() *echo.Echo {
	return s.echo
}
