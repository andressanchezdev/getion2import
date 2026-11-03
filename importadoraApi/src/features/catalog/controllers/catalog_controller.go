package controllers

// catalog_controller.go · controlador HTTP de catálogo (marcas, categorías y modelos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de catálogo (marcas, categorías y modelos) y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/features/catalog/services"
)

// CatalogController orquesta los manejadores de marcas, modelos y categorías
type CatalogController struct {
	service *services.CatalogService
}

// NewCatalogController crea el controlador con las piezas que necesita para funcionar.
func NewCatalogController(service *services.CatalogService) *CatalogController {
	return &CatalogController{service: service}
}
