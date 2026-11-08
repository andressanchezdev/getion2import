package services

// product_write_service · altas, cambios y retiro de productos
// conecta con: ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go)

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/products/dtos"
	"importadoraApi/src/features/products/repositories"

	"github.com/jackc/pgx/v5"
)

// Create registra un nuevo producto en catálogo con easysearch automático.
func (s *ProductService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateProductRequest, ip, ua string) (*dtos.ProductResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := req.CompanyID
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}
	if companyID == nil {
		return nil, utils.BadRequest("MISSING_COMPANY_ID", "El ID de compañía es requerido.")
	}

	codeClean := strings.TrimSpace(req.Code)
	nameClean := strings.TrimSpace(req.Name)
	if codeClean == "" || nameClean == "" {
		return nil, utils.BadRequest("INVALID_DATA", "El código y el nombre del producto son requeridos.")
	}

	// Verificar unicidad de (company_id, code)
	existing, err := s.productRepo.FindByCompanyAndCode(ctx, s.pool, *companyID, codeClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar código del producto.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("PRODUCT_CODE_EXISTS", "Ya existe un producto con ese código en la compañía.")
	}

	// Validar que la categoría exista y pertenezca a la compañía
	cat, err := s.categoryRepo.FindByID(ctx, s.pool, req.CategoryID)
	if err != nil {
		return nil, utils.Internal("Error al verificar categoría.", err)
	}
	if cat == nil || cat.CompanyID != *companyID {
		return nil, utils.BadRequest("INVALID_CATEGORY", "La categoría especificada no existe en la compañía.")
	}

	// Validar marca si se proporciona
	var brandName string
	if req.BrandID != nil {
		brand, err := s.brandRepo.FindByID(ctx, s.pool, *req.BrandID)
		if err != nil {
			return nil, utils.Internal("Error al verificar marca.", err)
		}
		if brand == nil || brand.CompanyID != *companyID {
			return nil, utils.BadRequest("INVALID_BRAND", "La marca especificada no existe en la compañía.")
		}
		brandName = brand.Name
	}

	// Validar modelo si se proporciona
	var modelName string
	if req.ModelID != nil {
		model, err := s.modelRepo.FindByID(ctx, s.pool, *req.ModelID)
		if err != nil {
			return nil, utils.Internal("Error al verificar modelo.", err)
		}
		if model == nil || model.CompanyID != *companyID {
			return nil, utils.BadRequest("INVALID_MODEL", "El modelo especificado no existe en la compañía.")
		}
		modelName = model.Name
	}

	unit := strings.TrimSpace(req.Unit)
	if unit == "" {
		unit = "UND"
	}

	status := types.ProductActive
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	isPromo := false
	if req.IsPromotion != nil {
		isPromo = *req.IsPromotion
	}

	isNewVal := false
	if req.IsNew != nil {
		isNewVal = *req.IsNew
	}

	lastCost := 0.0
	if req.LastCost != nil {
		lastCost = *req.LastCost
	}

	images := req.Images
	if images == nil {
		images = []string{}
	}

	pricesJSON := req.Prices.ToJSON()

	// dónde queda guardado: cada bodega debe ser de la compañía y cada ubicación debe existir y estar activa (se revisa ANTES de crear nada)
	if err := s.validateInitialStock(ctx, *companyID, req.InitialStock); err != nil {
		return nil, err
	}

	// Armar campo easysearch combinando código, nombre, marca, modelo, categoría y descripción
	easysearchVal := s.buildEasysearch(codeClean, nameClean, brandName, modelName, cat.Name, req.Description)

	entity := &repositories.ProductEntity{
		CompanyID:    *companyID,
		CategoryID:   req.CategoryID,
		CategoryName: cat.Name,
		BrandID:      req.BrandID,
		BrandName:    &brandName,
		ModelID:      req.ModelID,
		ModelName:    &modelName,
		Code:         codeClean,
		Name:         nameClean,
		Description:  req.Description,
		Unit:         unit,
		IVA:          req.IVA,
		Prices:       pricesJSON,
		LastCost:     lastCost,
		IsPromotion:  isPromo,
		IsNew:        isNewVal,
		Images:       images,
		Easysearch:   &easysearchVal,
		Status:       status,
	}

	// el producto, sus precios y su ubicación inicial se crean juntos: si algo falla no queda un producto a medias
	var created *repositories.ProductEntity
	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		saved, err := s.productRepo.Create(ctx, tx, entity)
		if err != nil {
			return err
		}
		created = saved
		if err := s.productRepo.UpsertPrices(ctx, tx, *companyID, created.ID, req.Prices.ToMap()); err != nil {
			return err
		}
		return s.assignInitialStock(ctx, tx, actor, *companyID, created.ID, req.InitialStock)
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "products",
		EntityID:  &created.ID,
		Action:    "PRODUCT_CREATED",
		Reason:    "Creación de producto en catálogo",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapProductToDTO(created, nil, nil), nil
}

// Update actualiza datos del producto.
func (s *ProductService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateProductRequest, ip, ua string) (*dtos.ProductResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.productRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if current == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este producto.")
		}
	}

	if req.Code != nil && strings.TrimSpace(*req.Code) != "" && strings.TrimSpace(*req.Code) != current.Code {
		cleanCode := strings.TrimSpace(*req.Code)
		existing, err := s.productRepo.FindByCompanyAndCode(ctx, s.pool, current.CompanyID, cleanCode)
		if err != nil {
			return nil, utils.Internal("Error al verificar código del producto.", err)
		}
		if existing != nil && existing.ID != current.ID {
			return nil, utils.Conflict("PRODUCT_CODE_EXISTS", "Ya existe otro producto con ese código en la compañía.")
		}
		current.Code = cleanCode
	}

	if req.CategoryID != nil && *req.CategoryID != current.CategoryID {
		cat, err := s.categoryRepo.FindByID(ctx, s.pool, *req.CategoryID)
		if err != nil {
			return nil, utils.Internal("Error al verificar categoría.", err)
		}
		if cat == nil || cat.CompanyID != current.CompanyID {
			return nil, utils.BadRequest("INVALID_CATEGORY", "La categoría especificada no existe en la compañía.")
		}
		current.CategoryID = *req.CategoryID
		current.CategoryName = cat.Name
	}

	if req.BrandID != nil {
		if *req.BrandID != 0 {
			brand, err := s.brandRepo.FindByID(ctx, s.pool, *req.BrandID)
			if err != nil {
				return nil, utils.Internal("Error al verificar marca.", err)
			}
			if brand == nil || brand.CompanyID != current.CompanyID {
				return nil, utils.BadRequest("INVALID_BRAND", "La marca especificada no existe en la compañía.")
			}
			current.BrandID = req.BrandID
			current.BrandName = &brand.Name
		} else {
			current.BrandID = nil
			current.BrandName = nil
		}
	}
	if req.ModelID != nil {
		if *req.ModelID != 0 {
			model, err := s.modelRepo.FindByID(ctx, s.pool, *req.ModelID)
			if err != nil {
				return nil, utils.Internal("Error al verificar modelo.", err)
			}
			if model == nil || model.CompanyID != current.CompanyID {
				return nil, utils.BadRequest("INVALID_MODEL", "El modelo especificado no existe en la compañía.")
			}
			current.ModelID = req.ModelID
			current.ModelName = &model.Name
		} else {
			current.ModelID = nil
			current.ModelName = nil
		}
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		current.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		current.Description = req.Description
	}
	if req.Unit != nil && strings.TrimSpace(*req.Unit) != "" {
		current.Unit = strings.TrimSpace(*req.Unit)
	}
	if req.IVA != nil {
		current.IVA = req.IVA
	}
	if req.Prices != nil {
		for tier, price := range *req.Prices {
			if price < 0 {
				return nil, utils.BadRequest("INVALID_PRICE", fmt.Sprintf("El precio de la tarifa %s no puede ser negativo.", tier))
			}
		}
		current.Prices = req.Prices.ToJSON()
	}
	if req.LastCost != nil {
		current.LastCost = *req.LastCost
	}
	if req.IsPromotion != nil {
		current.IsPromotion = *req.IsPromotion
	}
	if req.IsNew != nil {
		current.IsNew = *req.IsNew
	}
	if req.Images != nil {
		current.Images = req.Images
	}
	deactivationReason := ""
	if req.Status != nil {
		leaving := *req.Status == types.ProductInactive || *req.Status == types.ProductDiscontinued
		if leaving && current.Status != *req.Status {
			var verr error
			if deactivationReason, verr = utils.ValidateReason(req.Reason); verr != nil {
				return nil, verr
			}
		}
		current.Status = *req.Status
	}

	// Reconstruir easysearch
	var bName, mName string
	if current.BrandName != nil {
		bName = *current.BrandName
	}
	if current.ModelName != nil {
		mName = *current.ModelName
	}
	easysearchUpdated := s.buildEasysearch(current.Code, current.Name, bName, mName, current.CategoryName, current.Description)
	current.Easysearch = &easysearchUpdated

	updated, err := s.productRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar producto.", err)
	}

	// los precios viven en product_prices (una fila por tarifa): se guardan aparte y se relee el producto
	// para responder con TODAS las tarifas (si se cambio solo una, las demas no deben desaparecer de la respuesta)
	if req.Prices != nil {
		if err := s.productRepo.UpsertPrices(ctx, s.pool, current.CompanyID, current.ID, req.Prices.ToMap()); err != nil {
			return nil, utils.Internal("Error al actualizar los precios del producto.", err)
		}
		if fresh, err := s.productRepo.FindByID(ctx, s.pool, current.ID); err == nil && fresh != nil {
			updated = fresh
		}
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "products",
		EntityID:  &current.ID,
		Action:    "PRODUCT_UPDATED",
		Reason:    utils.ReasonOrDefault(deactivationReason, "Actualización de producto"),
		IPAddress: ip,
		UserAgent: ua,
	})

	codes, _ := s.productRepo.ListCodes(ctx, s.pool, current.ID)
	suppliers, _ := s.productRepo.ListSuppliers(ctx, s.pool, current.ID)
	return s.mapProductToDTO(updated, codes, suppliers), nil
}

// Delete retira de la operación al producto (soft-delete).
func (s *ProductService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	reason = strings.TrimSpace(reason)
	if len([]rune(reason)) < 10 || len([]rune(reason)) > 100 {
		return utils.BadRequest("INVALID_REASON", "El motivo debe tener entre 10 y 100 caracteres.")
	}

	current, err := s.productRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar producto.", err)
	}
	if current == nil {
		return utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para eliminar este producto.")
		}
	}

	currentBytes, err := json.Marshal(current)
	if err != nil {
		return utils.Internal("No se pudo preparar el registro del producto para la papelera.", err)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return utils.Internal("No se pudo iniciar la eliminación del producto.", err)
	}
	defer tx.Rollback(ctx)
	if _, err := s.recycleBinRepo.Insert(ctx, tx, &current.CompanyID, "products", current.ID, fmt.Sprintf("%s (%s)", current.Name, current.Code), currentBytes, string(actor.ActorType), actor.ActorID); err != nil {
		return utils.Internal("No se pudo guardar el producto en la papelera.", err)
	}
	if err := s.productRepo.SoftDelete(ctx, tx, id); err != nil {
		return utils.Internal("Error al eliminar producto.", err)
	}
	if err := s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "products",
		EntityID:  &current.ID,
		Action:    "PRODUCT_DEACTIVATED",
		Reason:    reason,
		IPAddress: ip,
		UserAgent: ua,
	}); err != nil {
		return utils.Internal("No se pudo registrar la eliminación del producto en auditoría.", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return utils.Internal("No se pudo completar la eliminación del producto.", err)
	}
	return nil
}
