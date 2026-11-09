package services

// product_thumbnail_service.go · miniaturas de producto por lote: la primera imagen de cada producto de la compañía de quien pregunta
// conecta con: ProductRepository.ListThumbnails y los dtos de productos; lo llama el controller de miniaturas
// ojo: máximo 200 productos por petición y solo de la compañía del usuario (el superadmin ve todas)

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/products/dtos"
)

const maxThumbnailIDs = 200

// Thumbnails devuelve la primera imagen de cada producto pedido (solo los que tienen).
func (s *ProductService) Thumbnails(ctx context.Context, actor *middlewares.ActorContext, ids []int64) ([]dtos.ProductThumbnailResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if len(ids) == 0 {
		return []dtos.ProductThumbnailResponse{}, nil
	}
	if len(ids) > maxThumbnailIDs {
		return nil, utils.BadRequest("TOO_MANY_IDS", "Se pueden pedir hasta 200 productos por vez.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	rows, err := s.productRepo.ListThumbnails(ctx, s.pool, companyID, ids)
	if err != nil {
		return nil, utils.Internal("Error al consultar las imágenes de los productos.", err)
	}
	out := make([]dtos.ProductThumbnailResponse, 0, len(rows))
	for _, row := range rows {
		if row.ImageURL != "" {
			out = append(out, dtos.ProductThumbnailResponse{ID: row.ID, ImageURL: row.ImageURL})
		}
	}
	return out, nil
}
