package services

// product_mapper · arma la respuesta del producto y su texto de búsqueda (easysearch)
// conecta con: ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go)

import (
	"encoding/json"
	"strings"

	"importadoraApi/src/features/products/dtos"
	"importadoraApi/src/features/products/repositories"
)

// mapProductToDTO arma la respuesta del producto con sus códigos y proveedores.
func (s *ProductService) mapProductToDTO(p *repositories.ProductEntity, codes []repositories.ProductCodeEntity, suppliers []repositories.ProductSupplierEntity) *dtos.ProductResponse {
	var prices dtos.ProductPrices
	_ = json.Unmarshal(p.Prices, &prices)

	codesDTO := make([]dtos.ProductCodeResponse, 0, len(codes))
	for i := range codes {
		codesDTO = append(codesDTO, dtos.ProductCodeResponse{
			ID:        codes[i].ID,
			ProductID: codes[i].ProductID,
			CodeType:  codes[i].CodeType,
			Code:      codes[i].Code,
		})
	}

	suppliersDTO := make([]dtos.ProductSupplierResponse, 0, len(suppliers))
	for i := range suppliers {
		suppliersDTO = append(suppliersDTO, dtos.ProductSupplierResponse{
			ProductID:    suppliers[i].ProductID,
			SupplierID:   suppliers[i].SupplierID,
			SupplierName: suppliers[i].SupplierName,
			Cost:         suppliers[i].Cost,
			SupplierCode: suppliers[i].SupplierCode,
		})
	}

	images := p.Images
	if images == nil {
		images = []string{}
	}

	return &dtos.ProductResponse{
		ID:           p.ID,
		UUID:         p.UUID,
		CompanyID:    p.CompanyID,
		CategoryID:   p.CategoryID,
		CategoryName: p.CategoryName,
		BrandID:      p.BrandID,
		BrandName:    p.BrandName,
		ModelID:      p.ModelID,
		ModelName:    p.ModelName,
		Code:         p.Code,
		Name:         p.Name,
		Description:  p.Description,
		Unit:         p.Unit,
		IVA:          p.IVA,
		Prices:       prices,
		LastCost:     p.LastCost,
		IsPromotion:  p.IsPromotion,
		IsNew:        p.IsNew,
		Images:       images,
		Easysearch:   p.Easysearch,
		Status:       p.Status,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
		Codes:        codesDTO,
		Suppliers:    suppliersDTO,
	}
}

// buildEasysearch genera la cadena optimizada para búsqueda rápida trigram a partir de los puntos clave del producto.
func (s *ProductService) buildEasysearch(code, name, brand, model, category string, description *string) string {
	parts := []string{strings.TrimSpace(code), strings.TrimSpace(name)}
	if b := strings.TrimSpace(brand); b != "" {
		parts = append(parts, b)
	}
	if m := strings.TrimSpace(model); m != "" {
		parts = append(parts, m)
	}
	if c := strings.TrimSpace(category); c != "" {
		parts = append(parts, c)
	}
	if description != nil && strings.TrimSpace(*description) != "" {
		parts = append(parts, strings.TrimSpace(*description))
	}
	return strings.ToUpper(strings.Join(parts, " "))
}
