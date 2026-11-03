package controllers

// inventory_controller.go · controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de inventario y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/features/inventory/services"
)

// InventoryController orquesta los manejadores de stock, traslados, conteos físicos y kardex
type InventoryController struct {
	service *services.InventoryService
}

// NewInventoryController crea el controlador con las piezas que necesita para funcionar.
func NewInventoryController(service *services.InventoryService) *InventoryController {
	return &InventoryController{service: service}
}
