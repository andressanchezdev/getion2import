package services

// customer_write_service · altas, cambios y retiro de clientes y su respuesta
// conecta con: CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go)

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/repositories"
)

// Create crea un nuevo cliente.
func (s *CustomerService) Create(ctx context.Context, actor *middlewares.ActorContext, req dtos.CreateCustomerRequest, ip, ua string) (*dtos.CustomerResponse, error) {
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

	docClean := strings.TrimSpace(req.Document)
	nameClean := strings.TrimSpace(req.Name)
	if docClean == "" || nameClean == "" {
		return nil, utils.BadRequest("INVALID_DATA", "Documento y nombre son obligatorios.")
	}

	// Verificar unicidad de (company_id, document)
	existing, err := s.customerRepo.FindByCompanyAndDocument(ctx, s.pool, *companyID, docClean)
	if err != nil {
		return nil, utils.Internal("Error al verificar documento del cliente.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("DOCUMENT_EXISTS", "Ya existe un cliente con este documento en la compañía.")
	}

	vatResp := false
	if req.VATResponsible != nil {
		vatResp = *req.VATResponsible
	}

	fiscalCodes := req.FiscalRespCodes
	if len(fiscalCodes) == 0 {
		fiscalCodes = []string{"R-99-PN"}
	}

	addressesBytes := []byte("[]")
	if len(req.Addresses) > 0 {
		addressesBytes = req.Addresses
	}

	contactsBytes := []byte("[]")
	if len(req.Contacts) > 0 {
		contactsBytes = req.Contacts
	}

	tier := req.PriceTier
	if tier == "" {
		tier = types.PriceTierP1
	}

	docsValidity := 12
	if req.DocsValidityMonths != nil && *req.DocsValidityMonths > 0 {
		docsValidity = *req.DocsValidityMonths
	}

	discount := 0.0
	if req.DiscountPercent != nil {
		discount = *req.DiscountPercent
	}

	creditEnabled := false
	if req.CreditEnabled != nil {
		creditEnabled = *req.CreditEnabled
	}

	creditLimit := 0.0
	if req.CreditLimit != nil {
		creditLimit = *req.CreditLimit
	}

	creditDays := int16(30)
	if req.CreditDays != nil {
		creditDays = *req.CreditDays
	}

	creditWarningPct := 70.00
	if req.CreditWarningPct != nil && *req.CreditWarningPct >= 0 {
		creditWarningPct = *req.CreditWarningPct
	}

	status := types.CustomerActive
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	docType := req.DocumentType
	if docType == "" {
		docType = types.DocCC
	}

	personType := req.PersonType
	if personType == "" {
		personType = types.PersonNatural
	}

	entity := &repositories.CustomerEntity{
		CompanyID:           *companyID,
		DocumentType:        docType,
		Document:            docClean,
		PersonType:          personType,
		Name:                nameClean,
		LastName:            req.LastName,
		TradeName:           req.TradeName,
		LegalRepresentative: req.LegalRepresentative,
		Email:               req.Email,
		Phone:               req.Phone,
		Mobile:              req.Mobile,
		Address:             req.Address,
		City:                req.City,
		VATResponsible:      vatResp,
		FiscalRespCodes:     fiscalCodes,
		Addresses:           addressesBytes,
		Contacts:            contactsBytes,
		PriceTier:           tier,
		DiscountPercent:     discount,
		CreditEnabled:       creditEnabled,
		CreditLimit:         creditLimit,
		CreditDays:          creditDays,
		CreditWarningPct:    creditWarningPct,
		DocsValidityMonths:  docsValidity,
		Status:              status,
	}

	created, err := s.customerRepo.Create(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: companyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customers",
		EntityID:  &created.ID,
		Action:    "CUSTOMER_CREATED",
		Reason:    "Creación de nuevo cliente",
		IPAddress: ip,
		UserAgent: ua,
	})

	return s.mapCustomerToDTO(created, nil), nil
}

// Update actualiza un cliente.
func (s *CustomerService) Update(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.UpdateCustomerRequest, ip, ua string) (*dtos.CustomerResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.customerRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este cliente.")
		}
	}

	if req.Document != nil && strings.TrimSpace(*req.Document) != "" && strings.TrimSpace(*req.Document) != current.Document {
		cleanDoc := strings.TrimSpace(*req.Document)
		existing, err := s.customerRepo.FindByCompanyAndDocument(ctx, s.pool, current.CompanyID, cleanDoc)
		if err != nil {
			return nil, utils.Internal("Error al verificar documento del cliente.", err)
		}
		if existing != nil && existing.ID != current.ID {
			return nil, utils.Conflict("DOCUMENT_EXISTS", "Ya existe otro cliente con este documento en la compañía.")
		}
		current.Document = cleanDoc
	}

	if req.DocumentType != nil {
		current.DocumentType = *req.DocumentType
	}
	if req.PersonType != nil {
		current.PersonType = *req.PersonType
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		current.Name = strings.TrimSpace(*req.Name)
	}
	if req.LastName != nil {
		current.LastName = req.LastName
	}
	if req.TradeName != nil {
		current.TradeName = req.TradeName
	}
	if req.LegalRepresentative != nil {
		current.LegalRepresentative = req.LegalRepresentative
	}
	if req.Email != nil {
		current.Email = req.Email
	}
	if req.Phone != nil {
		current.Phone = req.Phone
	}
	if req.Mobile != nil {
		current.Mobile = req.Mobile
	}
	if req.Address != nil {
		current.Address = req.Address
	}
	if req.City != nil {
		current.City = req.City
	}
	if req.VATResponsible != nil {
		current.VATResponsible = *req.VATResponsible
	}
	if len(req.FiscalRespCodes) > 0 {
		current.FiscalRespCodes = req.FiscalRespCodes
	}
	if len(req.Addresses) > 0 {
		current.Addresses = req.Addresses
	}
	if len(req.Contacts) > 0 {
		current.Contacts = req.Contacts
	}
	if req.PriceTier != nil {
		current.PriceTier = *req.PriceTier
	}
	if req.DiscountPercent != nil {
		current.DiscountPercent = *req.DiscountPercent
	}
	if req.CreditEnabled != nil {
		current.CreditEnabled = *req.CreditEnabled
	}
	if req.CreditLimit != nil {
		current.CreditLimit = *req.CreditLimit
	}
	if req.CreditDays != nil {
		current.CreditDays = *req.CreditDays
	}
	if req.CreditWarningPct != nil && *req.CreditWarningPct >= 0 {
		current.CreditWarningPct = *req.CreditWarningPct
	}
	if req.DocsValidityMonths != nil && *req.DocsValidityMonths > 0 {
		current.DocsValidityMonths = *req.DocsValidityMonths
	}
	if req.Status != nil {
		current.Status = *req.Status
	}

	updated, err := s.customerRepo.Update(ctx, s.pool, current)
	if err != nil {
		return nil, utils.NormalizeDBError(err, "El cliente no existe.")
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customers",
		EntityID:  &current.ID,
		Action:    "CUSTOMER_UPDATED",
		Reason:    "Actualización de datos del cliente",
		IPAddress: ip,
		UserAgent: ua,
	})

	docs, _ := s.customerRepo.ListDocuments(ctx, s.pool, current.ID)
	return s.mapCustomerToDTO(updated, docs), nil
}

// Delete retira de la operación al cliente (soft-delete).
func (s *CustomerService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, reason, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	reason = strings.TrimSpace(reason)
	if len([]rune(reason)) < 10 || len([]rune(reason)) > 100 {
		return utils.BadRequest("INVALID_REASON", "El motivo debe tener entre 10 y 100 caracteres.")
	}

	current, err := s.customerRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para eliminar este cliente.")
		}
	}

	currentBytes, err := json.Marshal(current)
	if err != nil {
		return utils.Internal("No se pudo preparar el registro del cliente para la papelera.", err)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return utils.Internal("No se pudo iniciar la eliminación del cliente.", err)
	}
	defer tx.Rollback(ctx)
	if _, err := s.recycleBinRepo.Insert(ctx, tx, &current.CompanyID, "customers", current.ID, fmt.Sprintf("%s (%s)", current.Name, current.Document), currentBytes, string(actor.ActorType), actor.ActorID); err != nil {
		return utils.Internal("No se pudo guardar el cliente en la papelera.", err)
	}
	if err := s.customerRepo.SoftDelete(ctx, tx, id); err != nil {
		return utils.Internal("Error al eliminar cliente.", err)
	}
	if err := s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customers",
		EntityID:  &current.ID,
		Action:    "CUSTOMER_DEACTIVATED",
		Reason:    reason,
		IPAddress: ip,
		UserAgent: ua,
	}); err != nil {
		return utils.Internal("No se pudo registrar la eliminación del cliente en auditoría.", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return utils.Internal("No se pudo completar la eliminación del cliente.", err)
	}
	return nil
}

// mapCustomerToDTO arma la respuesta del cliente con sus documentos.
func (s *CustomerService) mapCustomerToDTO(c *repositories.CustomerEntity, docs []repositories.CustomerDocumentEntity) *dtos.CustomerResponse {
	now := time.Now()
	docsDTO := make([]dtos.CustomerDocumentDTO, 0, len(docs))
	for i := range docs {
		docsDTO = append(docsDTO, toDocumentDTO(docs[i], c.DocsValidityMonths, now))
	}

	addresses := json.RawMessage(c.Addresses)
	if len(addresses) == 0 {
		addresses = json.RawMessage("[]")
	}

	contacts := json.RawMessage(c.Contacts)
	if len(contacts) == 0 {
		contacts = json.RawMessage("[]")
	}

	return &dtos.CustomerResponse{
		ID:                  c.ID,
		CompanyID:           c.CompanyID,
		DocumentType:        c.DocumentType,
		Document:            c.Document,
		PersonType:          c.PersonType,
		Name:                c.Name,
		LastName:            c.LastName,
		TradeName:           c.TradeName,
		LegalRepresentative: c.LegalRepresentative,
		Email:               c.Email,
		Phone:               c.Phone,
		Mobile:              c.Mobile,
		Address:             c.Address,
		City:                c.City,
		VATResponsible:      c.VATResponsible,
		FiscalRespCodes:     c.FiscalRespCodes,
		Addresses:           addresses,
		Contacts:            contacts,
		PriceTier:           c.PriceTier,
		DiscountPercent:     c.DiscountPercent,
		CreditEnabled:       c.CreditEnabled,
		CreditLimit:         c.CreditLimit,
		CreditDays:          c.CreditDays,
		CreditWarningPct:    c.CreditWarningPct,
		DocsValidityMonths:  c.DocsValidityMonths,
		Status:              c.Status,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
		Documents:           docsDTO,
	}
}
