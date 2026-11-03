package controllers

// staff_controller.go · controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/features/staff/services"
)

// StaffController orquesta las operaciones de administradores, empleados, roles y permisos
type StaffController struct {
	service *services.StaffService
}

// NewStaffController crea el controlador con las piezas que necesita para funcionar.
func NewStaffController(service *services.StaffService) *StaffController {
	return &StaffController{service: service}
}
