package services

// warehouse_write_service · altas, cambios y baja de bodegas y su respuesta
// conecta con: WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go)

import (
	"context"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5"
)

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
			CompanyID:       targetCompanyID,
			WarehouseID:     w.ID,
			TypeFacturation: types.FacturationJuridica,
			DocumentType:    types.DocNIT,
			NIT:             "SIN-CONFIGURAR",
			LegalName:       name,
			TradeName:       &name,
			BillingCity:     city,
			BillingAddress:  address,
			BillingPhone:    phone,
			InvoicePrefix:   &code,
			IsActive:        true,
		}
		_, err = s.warehouseRepo.UpsertFacturation(ctx, tx, initialFact)
		if err != nil {
			return err
		}

		// Inicializar series numéricas estándar por defecto
		return s.warehouseRepo.InitDefaultWarehouseSeries(ctx, tx, targetCompanyID, w.ID, code)
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
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
		return nil, utils.NormalizeDBError(err, "La bodega no existe.")
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

// mapToDTO convierte la bodega de la base en la respuesta que sale por la API.
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
		ID:                w.ID,
		CompanyID:         w.CompanyID,
		Code:              w.Code,
		Name:              w.Name,
		City:              city,
		Address:           address,
		Phone:             phone,
		Description:       desc,
		ManagerEmployeeID: w.ManagerEmployeeID,
		ManagerName:       w.ManagerName,
		LocationCount:     w.LocationCount,
		SkuCount:          w.SkuCount,
		IsActive:          w.IsActive,
		CreatedAt:         w.CreatedAt,
		UpdatedAt:         w.UpdatedAt,
		Facturation:       factDTO,
	}
}
