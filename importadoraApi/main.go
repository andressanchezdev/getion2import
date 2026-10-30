package main

import (
	"context"
	"log"
	"time"

	"importadoraApi/src/core/bootstrap"
	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/server"
)

func main() {
	// 1. Cargar configuración tipada desde entorno
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Error crítico al cargar configuración: %v", err)
	}

	// 2. Conectar a PostgreSQL con pgxpool y GORM
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	database, err := db.ConnectDatabase(ctx, cfg)
	if err != nil {
		log.Fatalf("Error crítico al conectar a la base de datos: %v", err)
	}
	defer database.Close()

	log.Printf("Conexión a PostgreSQL '%s' exitosa con GORM y pgxpool.", cfg.DBName)

	// 3. Inicializar Servidor Echo
	srv := server.NewServer(cfg)
	e := srv.Echo()

	// 4. Inyección de dependencias modular y registro de rutas
	container := bootstrap.NewContainer(cfg, database)
	bootstrap.RegisterAllRoutes(e, container)

	// 5. Arrancar servidor con graceful shutdown
	if err := srv.Start(); err != nil {
		log.Fatalf("Servidor detenido con error: %v", err)
	}
}
