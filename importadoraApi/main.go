package main

import (
	"context"
	"log"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/server"

	authControllers "importadoraApi/src/features/auth/controllers"
	authRepos "importadoraApi/src/features/auth/repositories"
	authRoutes "importadoraApi/src/features/auth/routes"
	authServices "importadoraApi/src/features/auth/services"

	healthControllers "importadoraApi/src/features/health/controllers"
	healthRoutes "importadoraApi/src/features/health/routes"
	healthServices "importadoraApi/src/features/health/services"

	companyControllers "importadoraApi/src/features/companies/controllers"
	companyRepos "importadoraApi/src/features/companies/repositories"
	companyRoutes "importadoraApi/src/features/companies/routes"
	companyServices "importadoraApi/src/features/companies/services"

	warehouseControllers "importadoraApi/src/features/warehouses/controllers"
	warehouseRepos "importadoraApi/src/features/warehouses/repositories"
	warehouseRoutes "importadoraApi/src/features/warehouses/routes"
	warehouseServices "importadoraApi/src/features/warehouses/services"

	staffControllers "importadoraApi/src/features/staff/controllers"
	staffRepos "importadoraApi/src/features/staff/repositories"
	staffRoutes "importadoraApi/src/features/staff/routes"
	staffServices "importadoraApi/src/features/staff/services"
)

func main() {
	// 1. Cargar configuración desde .env
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

	// 3. Inicializar repositorios base de autenticación y auditoría
	authRepo := authRepos.NewAuthRepository()
	auditRepo := authRepos.NewAuditRepository()

	// 4. Inicializar middleware de autenticación (cumple con SessionValidator)
	authMiddleware := middlewares.NewAuthMiddleware(cfg, database.Pool, authRepo)

	// 5. Inicializar Feature: Health
	healthService := healthServices.NewHealthService(cfg, database)
	healthCtrl := healthControllers.NewHealthController(healthService)

	// 6. Inicializar Feature: Auth
	authService := authServices.NewAuthService(cfg, database.Pool, authRepo, auditRepo)
	authCtrl := authControllers.NewAuthController(authService)

	// 7. Inicializar Feature: Companies
	companyRepo := companyRepos.NewCompanyRepository()
	companyService := companyServices.NewCompanyService(cfg, database.Pool, companyRepo, auditRepo)
	companyCtrl := companyControllers.NewCompanyController(companyService)

	// 8. Inicializar Feature: Warehouses
	warehouseRepo := warehouseRepos.NewWarehouseRepository()
	warehouseService := warehouseServices.NewWarehouseService(cfg, database.Pool, warehouseRepo, auditRepo)
	warehouseCtrl := warehouseControllers.NewWarehouseController(warehouseService)

	// 9. Inicializar Feature: Staff (Admins, Roles, Permisos, Empleados)
	adminRepo := staffRepos.NewAdminRepository()
	roleRepo := staffRepos.NewRoleRepository()
	permissionRepo := staffRepos.NewPermissionRepository()
	employeeRepo := staffRepos.NewEmployeeRepository()
	staffService := staffServices.NewStaffService(cfg, database.Pool, adminRepo, roleRepo, permissionRepo, employeeRepo, auditRepo)
	staffCtrl := staffControllers.NewStaffController(staffService)

	// 10. Configurar servidor HTTP Echo y registrar rutas por feature
	srv := server.NewServer(cfg)
	e := srv.Echo()

	healthRoutes.RegisterRoutes(e, healthCtrl)
	authRoutes.RegisterRoutes(e, authMiddleware, authCtrl)
	companyRoutes.RegisterRoutes(e, authMiddleware, companyCtrl)
	warehouseRoutes.RegisterRoutes(e, authMiddleware, warehouseCtrl)
	staffRoutes.RegisterRoutes(e, authMiddleware, staffCtrl)

	// 11. Arrancar servidor HTTP con graceful shutdown
	if err := srv.Start(); err != nil {
		log.Fatalf("Servidor detenido con error: %v", err)
	}
}
