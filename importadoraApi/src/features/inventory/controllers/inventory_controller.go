package controllers

import (
	"importadoraApi/src/features/inventory/services"
)

// InventoryController orquesta los manejadores de stock, traslados, conteos físicos y kardex
type InventoryController struct {
	service *services.InventoryService
}

func NewInventoryController(service *services.InventoryService) *InventoryController {
	return &InventoryController{service: service}
}
