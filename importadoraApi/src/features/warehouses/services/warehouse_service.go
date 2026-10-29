package services

import (
	"context"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WarehouseService struct {
	cfg           *config.Config
	pool          *pgxpool.Pool
	warehouseRepo *repositories.WarehouseRepository
	auditRepo     *authRepos.AuditRepository
}

func NewWarehouseService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	warehouseRepo *repositories.WarehouseRepository,
	auditRepo *authRepos.AuditRepository,
) *WarehouseService {
	return &WarehouseService{
		cfg:           cfg,
		pool:          pool,
		warehouseRepo: warehouseRepo,
		auditRepo:     auditRepo,
	}
}

// GetByID recupera la bodega con su configuración fiscal incrustada.
func (s *WarehouseService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.WarehouseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.warehouseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar la bodega.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para consultar esta bodega.")
		}
	}

	fact, _ := s.warehouseRepo.FindFacturationByWarehouseID(ctx, s.pool, id)
	return s.mapToDTO(entity, fact), nil
}

// List lista bodegas con paginación respetando aislamiento multi-tenant.
func (s *WarehouseService) List(ctx context.Context, actor *middlewares.ActorContext, params utils.PageParams) ([]dtos.WarehouseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID, err := middlewares.EffectiveCompanyIDFromContext(actor)
	if err != nil {
		return nil, nil, err
	}

	entities, total, err := s.warehouseRepo.List(ctx, s.pool, companyID, params)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar bodegas.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.WarehouseResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// Search busca bodegas por coincidencia de texto en código, nombre, ciudad o teléfono.
func (s *WarehouseService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.WarehouseResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	cleanQ := strings.TrimSpace(query)
	if cleanQ == "" {
		return s.List(ctx, actor, params)
	}

	companyID, err := middlewares.EffectiveCompanyIDFromContext(actor)
	if err != nil {
		return nil, nil, err
	}

	entities, total, err := s.warehouseRepo.Search(ctx, s.pool, companyID, cleanQ, params)
	if err != nil {
		return nil, nil, utils.Internal("Error al buscar bodegas.", err)
	}

	meta := utils.BuildMeta(params.Page, params.PageSize, total)
	result := make([]dtos.WarehouseResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// Create crea una nueva bodega e inicializa automáticamente sus series numéricas e información fiscal.
func (s *WarehouseService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateWarehouseRequest, ip, ua string) (*dtos.WarehouseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	name := strings.TrimSpace(req.Name)
	if code == "" || name == "" {
		return nil, utils.BadRequest("MISSING_FIELDS", "El código y el nombre de la bodega son obligatorios.")
	}

	var targetCompanyID int64
	if actor.ActorType == types.ActorSuperadmin {
		if req.CompanyID != nil && *req.CompanyID > 0 {
			targetCompanyID = *req.CompanyID
		} else if actor.CompanyID != nil && *actor.CompanyID > 0 {
			targetCompanyID = *actor.CompanyID
		} else {
			return nil, utils.BadRequest("MISSING_COMPANY_ID", "Debe especificar el companyId para la bodega.")
		}
	} else {
		if actor.CompanyID == nil || *actor.CompanyID <= 0 {
			return nil, utils.Forbidden("FORBIDDEN_NO_COMPANY", "No perteneces a ninguna compañía activa.")
		}
		targetCompanyID = *actor.CompanyID
	}

	// Verificar unicidad de código dentro de la compañía
	existing, err := s.warehouseRepo.FindByCode(ctx, s.pool, targetCompanyID, code)
	if err != nil {
		return nil, utils.Internal("Error al validar código de bodega.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("WAREHOUSE_CODE_EXISTS", "Ya existe una bodega con este código en la compañía.")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	var city, address, phone, desc *string
	if strings.TrimSpace(req.City) != "" {
		t := strings.TrimSpace(req.City)
		city = &t
	}
	if strings.TrimSpace(req.Address) != "" {
		t := strings.TrimSpace(req.Address)
		address = &t
	}
	if strings.TrimSpace(req.Phone) != "" {
		t := strings.TrimSpace(req.Phone)
		phone = &t
	}
	if strings.TrimSpace(req.Description) != "" {
		t := strings.TrimSpace(req.Description)
		desc = &t
	}

	entity := &repositories.WarehouseEntity{
		CompanyID:   targetCompanyID,
		Code:        code,
		Name:        name,
		City:        city,
		Address:     address,
		Phone:       phone,
		Description: desc,
		IsActive:    isActive,
	}

	var created *repositories.WarehouseEntity
	var initialFact *repositories.FacturationEntity

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		w, err := s.warehouseRepo.Create(ctx, tx, entity)
		if err != nil {
			return err
		}
		created = w

		// Inicializar facturación base para la bodega
		initialFact = &repositories.FacturationEntity{
			CompanyID:        targetCompanyID,
			WarehouseID:      w.ID,
			TypeFacturation:  types.FacturationJuridica,
			DocumentType:     types.DocNIT,
			NIT:              "SIN-CONFIGURAR",
			LegalName:        name,
			TradeName:        &name,
			BillingCity:      city,
			BillingAddress:   address,
			BillingPhone:     phone,
			InvoicePrefix:    &code,
			IsActive:         true,
		}
		_, err = s.warehouseRepo.UpsertFacturation(ctx, tx, initialFact)
		if err != nil {
			return err
		}

		// Inicializar series numéricas estándar por defecto
		return s.warehouseRepo.InitDefaultWarehouseSeries(ctx, tx, targetCompanyID, w.ID, code)
	})
	if err != nil {
		return nil, utils.Internal("Error al registrar la bodega y sus series fiscales.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &targetCompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "warehouses",
		EntityID:  &created.ID,
		Action:    "WAREHOUSE_CREATED",
		Reason:    "Creación de nueva bodega con series automáticas",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapToDTO(created, initialFact), nil
}

// Update actualiza datos operacionales de la bodega.
func (s *WarehouseService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateWarehouseRequest, ip, ua string) (*dtos.WarehouseResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.warehouseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar la bodega.", err)
	}
	if current == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para actualizar esta bodega.")
		}
	}

	if req.Code != nil {
		newCode := strings.ToUpper(strings.TrimSpace(*req.Code))
		if newCode == "" {
			return nil, utils.BadRequest("INVALID_CODE", "El código no puede estar vacío.")
		}
		if newCode != current.Code {
			existing, err := s.warehouseRepo.FindByCode(ctx, s.pool, current.CompanyID, newCode)
			if err != nil {
				return nil, utils.Internal("Error al verificar código de bodega.", err)
			}
			if existing != nil && existing.ID != id {
				return nil, utils.Conflict("WAREHOUSE_CODE_EXISTS", "Ya existe otra bodega con ese código en la compañía.")
			}
			current.Code = newCode
		}
	}

	if req.Name != nil {
		n := strings.TrimSpace(*req.Name)
		if n == "" {
			return nil, utils.BadRequest("INVALID_NAME", "El nombre de la bodega no puede estar vacío.")
		}
		current.Name = n
	}

	if req.City != nil {
		t := strings.TrimSpace(*req.City)
		if t == "" {
			current.City = nil
		} else {
			current.City = &t
		}
	}

	if req.Address != nil {
		t := strings.TrimSpace(*req.Address)
		if t == "" {
			current.Address = nil
		} else {
			current.Address = &t
		}
	}

	if req.Phone != nil {
		t := strings.TrimSpace(*req.Phone)
		if t == "" {
			current.Phone = nil
		} else {
			current.Phone = &t
		}
	}

	if req.Description != nil {
		t := strings.TrimSpace(*req.Description)
		if t == "" {
			current.Description = nil
		} else {
			current.Description = &t
		}
	}

	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.warehouseRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al actualizar la bodega.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &updated.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "warehouses",
		EntityID:  &updated.ID,
		Action:    "WAREHOUSE_UPDATED",
		Reason:    "Actualización de datos de bodega",
		IPAddress: ip,
		UserAgent: ua,
	})

	fact, _ := s.warehouseRepo.FindFacturationByWarehouseID(ctx, s.pool, id)
	return s.mapToDTO(updated, fact), nil
}

// Deactivate desactiva operativamente una bodega.
func (s *WarehouseService) Deactivate(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.warehouseRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar la bodega.", err)
	}
	if current == nil {
		return utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para desactivar esta bodega.")
		}
	}

	if err := s.warehouseRepo.Deactivate(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al desactivar la bodega.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "warehouses",
		EntityID:  &id,
		Action:    "WAREHOUSE_DEACTIVATED",
		Reason:    "Desactivación operativa de bodega",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// GetFacturation consulta los datos fiscales de facturación de la bodega.
func (s *WarehouseService) GetFacturation(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64) (*dtos.WarehouseFacturationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	wh, err := s.warehouseRepo.FindByID(ctx, s.pool, warehouseID)
	if err != nil || wh == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega solicitada no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != wh.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para consultar esta configuración fiscal.")
		}
	}

	fact, err := s.warehouseRepo.FindFacturationByWarehouseID(ctx, s.pool, warehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar la facturación fiscal.", err)
	}
	if fact == nil {
		return nil, utils.NotFound("FACTURATION_NOT_CONFIGURED", "La bodega no tiene datos fiscales configurados.")
	}

	return s.mapFacturationToDTO(fact), nil
}

// UpdateFacturation configura o actualiza los datos fiscales de la bodega.
func (s *WarehouseService) UpdateFacturation(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64, req dtos.UpdateFacturationRequest, ip, ua string) (*dtos.WarehouseFacturationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	wh, err := s.warehouseRepo.FindByID(ctx, s.pool, warehouseID)
	if err != nil || wh == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != wh.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso para configurar la facturación de esta bodega.")
		}
	}

	current, _ := s.warehouseRepo.FindFacturationByWarehouseID(ctx, s.pool, warehouseID)
	if current == nil {
		current = &repositories.FacturationEntity{
			CompanyID:       wh.CompanyID,
			WarehouseID:     warehouseID,
			TypeFacturation: types.FacturationJuridica,
			DocumentType:    types.DocNIT,
			NIT:             "0",
			LegalName:       wh.Name,
			IsActive:        true,
		}
	}

	if req.TypeFacturation != nil {
		current.TypeFacturation = *req.TypeFacturation
	}
	if req.DocumentType != nil {
		current.DocumentType = *req.DocumentType
	}
	if req.NIT != nil && strings.TrimSpace(*req.NIT) != "" {
		current.NIT = strings.TrimSpace(*req.NIT)
	}
	if req.LegalName != nil && strings.TrimSpace(*req.LegalName) != "" {
		current.LegalName = strings.TrimSpace(*req.LegalName)
	}
	if req.TradeName != nil {
		t := strings.TrimSpace(*req.TradeName)
		current.TradeName = &t
	}
	if req.BillingEmail != nil {
		t := strings.ToLower(strings.TrimSpace(*req.BillingEmail))
		current.BillingEmail = &t
	}
	if req.BillingPhone != nil {
		t := strings.TrimSpace(*req.BillingPhone)
		current.BillingPhone = &t
	}
	if req.BillingAddress != nil {
		t := strings.TrimSpace(*req.BillingAddress)
		current.BillingAddress = &t
	}
	if req.BillingCity != nil {
		t := strings.TrimSpace(*req.BillingCity)
		current.BillingCity = &t
	}
	if req.LogoURL != nil {
		t := strings.TrimSpace(*req.LogoURL)
		current.LogoURL = &t
	}
	if req.VatWithholder != nil {
		current.VatWithholder = *req.VatWithholder
	}
	if req.IncomeWithholder != nil {
		current.IncomeWithholder = *req.IncomeWithholder
	}
	if req.SelfWithholder != nil {
		current.SelfWithholder = *req.SelfWithholder
	}
	if req.InvoicePrefix != nil {
		t := strings.ToUpper(strings.TrimSpace(*req.InvoicePrefix))
		current.InvoicePrefix = &t
	}
	if req.ResolutionNumber != nil {
		t := strings.TrimSpace(*req.ResolutionNumber)
		current.ResolutionNumber = &t
	}
	if req.ResolutionDate != nil {
		parsedDate, err := time.Parse("2006-01-02", strings.TrimSpace(*req.ResolutionDate))
		if err == nil {
			current.ResolutionDate = &parsedDate
		}
	}
	if req.RangeFrom != nil {
		current.RangeFrom = req.RangeFrom
	}
	if req.RangeTo != nil {
		current.RangeTo = req.RangeTo
	}
	if current.RangeFrom != nil && current.RangeTo != nil && *current.RangeTo < *current.RangeFrom {
		return nil, utils.BadRequest("INVALID_RANGE", "El rango 'hasta' no puede ser menor que el rango 'desde'.")
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	saved, err := s.warehouseRepo.UpsertFacturation(ctx, s.pool, current)
	if err != nil {
		return nil, utils.Internal("Error al guardar datos fiscales de facturación.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &wh.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "warehouse_facturation",
		EntityID:  &saved.ID,
		Action:    "FACTURATION_CONFIGURED",
		Reason:    "Configuración fiscal de facturación de bodega",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapFacturationToDTO(saved), nil
}

// ListDocSeries lista los consecutivos y series configurados para la bodega o compañía.
func (s *WarehouseService) ListDocSeries(ctx context.Context, actor *middlewares.ActorContext, warehouseID *int64, docType *types.DocSeriesType) ([]dtos.DocSeriesResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID, err := middlewares.EffectiveCompanyIDFromContext(actor)
	if err != nil {
		return nil, err
	}

	items, err := s.warehouseRepo.ListDocSeries(ctx, s.pool, companyID, warehouseID, docType)
	if err != nil {
		return nil, utils.Internal("Error al consultar series numéricas.", err)
	}

	seriesList := make([]dtos.DocSeriesResponse, 0, len(items))
	for _, it := range items {
		seriesList = append(seriesList, dtos.DocSeriesResponse{
			ID:          it.ID,
			CompanyID:   it.CompanyID,
			WarehouseID: it.WarehouseID,
			DocType:     it.DocType,
			Prefix:      it.Prefix,
			NextNumber:  it.NextNumber,
		})
	}
	return seriesList, nil
}

// UpdateDocSeries actualiza el prefijo o próximo consecutivo de una serie numérica.
func (s *WarehouseService) UpdateDocSeries(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateDocSeriesRequest, ip, ua string) (*dtos.DocSeriesResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.warehouseRepo.FindDocSeriesByID(ctx, s.pool, id)
	if err != nil || current == nil {
		return nil, utils.NotFound("DOC_SERIES_NOT_FOUND", "La serie numérica no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_DOC_SERIES_ACCESS", "No tienes permiso para actualizar esta serie numérica.")
		}
	}

	updated, err := s.warehouseRepo.UpdateDocSeries(ctx, s.pool, id, req.Prefix, req.NextNumber)
	if err != nil {
		return nil, utils.Internal("Error al actualizar la serie numérica.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &updated.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "doc_series",
		EntityID:  &updated.ID,
		Action:    "DOC_SERIES_UPDATED",
		Reason:    "Mantenimiento de consecutivo de serie numérica",
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.DocSeriesResponse{
		ID:          updated.ID,
		CompanyID:   updated.CompanyID,
		WarehouseID: updated.WarehouseID,
		DocType:     updated.DocType,
		Prefix:      updated.Prefix,
		NextNumber:  updated.NextNumber,
	}, nil
}

func (s *WarehouseService) mapToDTO(w *repositories.WarehouseEntity, fact *repositories.FacturationEntity) *dtos.WarehouseResponse {
	var city, address, phone, desc string
	if w.City != nil {
		city = *w.City
	}
	if w.Address != nil {
		address = *w.Address
	}
	if w.Phone != nil {
		phone = *w.Phone
	}
	if w.Description != nil {
		desc = *w.Description
	}

	var factDTO *dtos.WarehouseFacturationResponse
	if fact != nil {
		factDTO = s.mapFacturationToDTO(fact)
	}

	return &dtos.WarehouseResponse{
		ID:          w.ID,
		CompanyID:   w.CompanyID,
		Code:        w.Code,
		Name:        w.Name,
		City:        city,
		Address:     address,
		Phone:       phone,
		Description: desc,
		IsActive:    w.IsActive,
		CreatedAt:   w.CreatedAt,
		UpdatedAt:   w.UpdatedAt,
		Facturation: factDTO,
	}
}

func (s *WarehouseService) mapFacturationToDTO(f *repositories.FacturationEntity) *dtos.WarehouseFacturationResponse {
	var trade, email, phone, addr, city, logo, invPrefix, resNum string
	if f.TradeName != nil {
		trade = *f.TradeName
	}
	if f.BillingEmail != nil {
		email = *f.BillingEmail
	}
	if f.BillingPhone != nil {
		phone = *f.BillingPhone
	}
	if f.BillingAddress != nil {
		addr = *f.BillingAddress
	}
	if f.BillingCity != nil {
		city = *f.BillingCity
	}
	if f.LogoURL != nil {
		logo = *f.LogoURL
	}
	if f.InvoicePrefix != nil {
		invPrefix = *f.InvoicePrefix
	}
	if f.ResolutionNumber != nil {
		resNum = *f.ResolutionNumber
	}

	var resDateStr *string
	if f.ResolutionDate != nil {
		formatted := f.ResolutionDate.Format("2006-01-02")
		resDateStr = &formatted
	}

	return &dtos.WarehouseFacturationResponse{
		ID:               f.ID,
		CompanyID:        f.CompanyID,
		WarehouseID:      f.WarehouseID,
		TypeFacturation:  f.TypeFacturation,
		DocumentType:     f.DocumentType,
		NIT:              f.NIT,
		LegalName:        f.LegalName,
		TradeName:        trade,
		BillingEmail:     email,
		BillingPhone:     phone,
		BillingAddress:   addr,
		BillingCity:      city,
		LogoURL:          logo,
		VatWithholder:    f.VatWithholder,
		IncomeWithholder: f.IncomeWithholder,
		SelfWithholder:   f.SelfWithholder,
		InvoicePrefix:    invPrefix,
		ResolutionNumber: resNum,
		ResolutionDate:   resDateStr,
		RangeFrom:        f.RangeFrom,
		RangeTo:          f.RangeTo,
		IsActive:         f.IsActive,
		CreatedAt:        f.CreatedAt,
		UpdatedAt:        f.UpdatedAt,
	}
}
