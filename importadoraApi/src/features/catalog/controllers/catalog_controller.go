package controllers

import (
	"importadoraApi/src/features/catalog/services"
)

// CatalogController orquesta los manejadores de marcas, modelos y categorías
type CatalogController struct {
	service *services.CatalogService
}

func NewCatalogController(service *services.CatalogService) *CatalogController {
	return &CatalogController{service: service}
}
