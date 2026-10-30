package controllers

import (
	"importadoraApi/src/features/staff/services"
)

// StaffController orquesta las operaciones de administradores, empleados, roles y permisos
type StaffController struct {
	service *services.StaffService
}

func NewStaffController(service *services.StaffService) *StaffController {
	return &StaffController{service: service}
}
