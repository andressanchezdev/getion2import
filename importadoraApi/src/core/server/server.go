package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Server struct {
	echo *echo.Echo
	cfg  *config.Config
}

func NewServer(cfg *config.Config) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HTTPErrorHandler = utils.EchoErrorHandler

	// Middlewares globales estándar
	e.Use(middleware.Recover())
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "${time_rfc3339} | ${status} | ${latency_human} | ${remote_ip} | ${method} ${uri}\n",
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

	// Servir archivos estáticos de subidas
	_ = os.MkdirAll("./uploads", 0755)
	e.Static("/uploads", "./uploads")

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

