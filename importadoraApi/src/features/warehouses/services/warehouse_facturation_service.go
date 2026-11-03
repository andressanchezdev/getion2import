package services

// warehouse_facturation_service · facturación de la bodega y sus series de documentos
// conecta con: WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go)

import (
	"context"
	"strings"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/repositories"
)

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

// mapFacturationToDTO convierte la bodega de la base en la respuesta que sale por la API.
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
