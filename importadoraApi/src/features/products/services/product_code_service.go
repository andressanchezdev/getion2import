package services

// product_code_service · códigos del producto (barras, OEM y otros)
// conecta con: ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go)

import (
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/products/dtos"
)

// ListCodes lista los códigos de un producto, validando que sea de la compañía del usuario.
func (s *ProductService) ListCodes(ctx context.Context, actor *middlewares.ActorContext, productID int64) ([]dtos.ProductCodeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este producto.")
		}
	}

	entities, err := s.productRepo.ListCodes(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar códigos del producto.", err)
	}

	res := make([]dtos.ProductCodeResponse, 0, len(entities))
	for i := range entities {
		res = append(res, dtos.ProductCodeResponse{
			ID:        entities[i].ID,
			ProductID: entities[i].ProductID,
			CodeType:  entities[i].CodeType,
			Code:      entities[i].Code,
		})
	}
	return res, nil
}

// CreateCode agrega un código a un producto sin repetir códigos dentro de la compañía.
func (s *ProductService) CreateCode(ctx context.Context, actor *middlewares.ActorContext, productID int64, req dtos.CreateProductCodeRequest, ip, ua string) (*dtos.ProductCodeResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este producto.")
		}
	}

	cleanCode := strings.TrimSpace(req.Code)
	if cleanCode == "" {
		return nil, utils.BadRequest("INVALID_CODE", "El código es requerido.")
	}

	created, err := s.productRepo.CreateCode(ctx, s.pool, product.CompanyID, productID, req.CodeType, cleanCode)
	if err != nil {
		return nil, utils.Internal("Error al registrar código alterno.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_codes",
		EntityID:  &created.ID,
		Action:    "PRODUCT_CODE_CREATED",
		Reason:    fmt.Sprintf("Adición de código %s (%s)", req.CodeType, cleanCode),
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.ProductCodeResponse{
		ID:        created.ID,
		ProductID: created.ProductID,
		CodeType:  created.CodeType,
		Code:      created.Code,
	}, nil
}

// DeleteCode quita un código de un producto.
func (s *ProductService) DeleteCode(ctx context.Context, actor *middlewares.ActorContext, productID, codeID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este producto.")
		}
	}

	if err := s.productRepo.DeleteCode(ctx, s.pool, codeID); err != nil {
		return utils.Internal("Error al eliminar código.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_codes",
		EntityID:  &codeID,
		Action:    "PRODUCT_CODE_DELETED",
		Reason:    "Eliminación de código alterno",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}
