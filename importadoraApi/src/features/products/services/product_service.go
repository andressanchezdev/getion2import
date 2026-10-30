package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	catalogRepos "importadoraApi/src/features/catalog/repositories"
	"importadoraApi/src/features/products/dtos"
	"importadoraApi/src/features/products/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	productRepo  *repositories.ProductRepository
	categoryRepo *catalogRepos.CategoryRepository
	brandRepo    *catalogRepos.BrandRepository
	modelRepo    *catalogRepos.ModelRepository
	auditRepo    *authRepos.AuditRepository
}

func NewProductService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	productRepo *repositories.ProductRepository,
	categoryRepo *catalogRepos.CategoryRepository,
	brandRepo *catalogRepos.BrandRepository,
	modelRepo *catalogRepos.ModelRepository,
	auditRepo *authRepos.AuditRepository,
) *ProductService {
	return &ProductService{
		cfg:          cfg,
		pool:         pool,
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
		brandRepo:    brandRepo,
		modelRepo:    modelRepo,
		auditRepo:    auditRepo,
	}
}

// List obtiene el listado paginado de productos.
func (s *ProductService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.ProductFilterQuery) ([]dtos.ProductResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.productRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar productos.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.ProductResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapProductToDTO(&entities[i], nil, nil))
	}

	return result, &meta, nil
}

// Search busca productos mediante el campo easysearch indexado con GIN trigram.
func (s *ProductService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.ProductResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}

	filter := dtos.ProductFilterQuery{
		CompanyID: companyID,
		Search:    strings.TrimSpace(query),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	return s.List(ctx, actor, filter)
}

// GetByID obtiene el detalle completo del producto con sus códigos y proveedores adjuntos.
func (s *ProductService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.ProductResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.productRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este producto.")
		}
	}

	codes, _ := s.productRepo.ListCodes(ctx, s.pool, id)
	suppliers, _ := s.productRepo.ListSuppliers(ctx, s.pool, id)

	return s.mapProductToDTO(entity, codes, suppliers), nil
}

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

	lastCost := 0.0
	if req.LastCost != nil {
		lastCost = *req.LastCost
	}

	images := req.Images
	if images == nil {
		images = []string{}
	}

	pricesJSON := req.Prices.ToJSON()

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
		Images:       images,
		Easysearch:   &easysearchVal,
		Status:       status,
	}

	created, err := s.productRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.Internal("Error al registrar producto.", err)
	}

	_ = s.productRepo.UpsertPrices(ctx, s.pool, *companyID, created.ID, req.Prices.ToMap())

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
		current.Prices = req.Prices.ToJSON()
	}
	if req.LastCost != nil {
		current.LastCost = *req.LastCost
	}
	if req.IsPromotion != nil {
		current.IsPromotion = *req.IsPromotion
	}
	if req.Images != nil {
		current.Images = req.Images
	}
	if req.Status != nil {
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

	if req.Prices != nil {
		_ = s.productRepo.UpsertPrices(ctx, s.pool, current.CompanyID, current.ID, req.Prices.ToMap())
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "products",
		EntityID:  &current.ID,
		Action:    "PRODUCT_UPDATED",
		Reason:    "Actualización de producto",
		IPAddress: ip,
		UserAgent: ua,
	})

	codes, _ := s.productRepo.ListCodes(ctx, s.pool, current.ID)
	suppliers, _ := s.productRepo.ListSuppliers(ctx, s.pool, current.ID)
	return s.mapProductToDTO(updated, codes, suppliers), nil
}

// Delete retira de la operación al producto (soft-delete).
func (s *ProductService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
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

	if err := s.productRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al eliminar producto.", err)
	}

	currentBytes, _ := json.Marshal(current)
	const recycleSQL = `
		INSERT INTO recycle_bin (
			company_id, entity_table, entity_id, entity_label, entity_data,
			deleted_by_actor_type, deleted_by_actor_id
		) VALUES ($1, 'products', $2, $3, $4, $5, $6)
	`
	_, _ = s.pool.Exec(ctx, recycleSQL, current.CompanyID, current.ID, fmt.Sprintf("%s (%s)", current.Name, current.Code), currentBytes, string(actor.ActorType), actor.ActorID)

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "products",
		EntityID:  &current.ID,
		Action:    "PRODUCT_DEACTIVATED",
		Reason:    "Retiro de la operación (soft-delete)",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// MÉTODOS PARA CÓDIGOS DE PRODUCTO
// ==========================================

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

// ==========================================
// MÉTODOS PARA PROVEEDORES DEL PRODUCTO
// ==========================================

func (s *ProductService) ListSuppliers(ctx context.Context, actor *middlewares.ActorContext, productID int64) ([]dtos.ProductSupplierResponse, error) {
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

	entities, err := s.productRepo.ListSuppliers(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedores del producto.", err)
	}

	res := make([]dtos.ProductSupplierResponse, 0, len(entities))
	for i := range entities {
		res = append(res, dtos.ProductSupplierResponse{
			ProductID:    entities[i].ProductID,
			SupplierID:   entities[i].SupplierID,
			SupplierName: entities[i].SupplierName,
			Cost:         entities[i].Cost,
			SupplierCode: entities[i].SupplierCode,
		})
	}
	return res, nil
}

func (s *ProductService) AssignSupplier(ctx context.Context, actor *middlewares.ActorContext, productID int64, req dtos.AssignProductSupplierRequest, ip, ua string) error {
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

	if err := s.productRepo.AssignSupplier(ctx, s.pool, productID, req.SupplierID, req.Cost, req.SupplierCode); err != nil {
		return utils.Internal("Error al asignar proveedor al producto.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_suppliers",
		EntityID:  &productID,
		Action:    "PRODUCT_SUPPLIER_ASSIGNED",
		Reason:    fmt.Sprintf("Asignación de proveedor ID %d con costo %.2f", req.SupplierID, req.Cost),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

func (s *ProductService) RemoveSupplier(ctx context.Context, actor *middlewares.ActorContext, productID, supplierID int64, ip, ua string) error {
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

	if err := s.productRepo.RemoveSupplier(ctx, s.pool, productID, supplierID); err != nil {
		return utils.Internal("Error al desvincular proveedor.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_suppliers",
		EntityID:  &productID,
		Action:    "PRODUCT_SUPPLIER_REMOVED",
		Reason:    fmt.Sprintf("Desvinculación de proveedor ID %d", supplierID),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

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


