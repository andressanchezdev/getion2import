package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/repositories"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomerService struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	customerRepo *repositories.CustomerRepository
	auditRepo    *authRepos.AuditRepository
}

func NewCustomerService(
	cfg *config.Config,
	pool *pgxpool.Pool,
	customerRepo *repositories.CustomerRepository,
	auditRepo *authRepos.AuditRepository,
) *CustomerService {
	return &CustomerService{
		cfg:          cfg,
		pool:         pool,
		customerRepo: customerRepo,
		auditRepo:    auditRepo,
	}
}

// List obtiene el listado paginado de clientes validando aislamiento de compañía.
func (s *CustomerService) List(ctx context.Context, actor *middlewares.ActorContext, filter dtos.CustomerFilterQuery) ([]dtos.CustomerResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		filter.CompanyID = actor.CompanyID
	}

	entities, total, err := s.customerRepo.List(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar clientes.", err)
	}

	meta := utils.BuildMeta(filter.Page, filter.PageSize, total)
	result := make([]dtos.CustomerResponse, 0, len(entities))
	for i := range entities {
		result = append(result, *s.mapCustomerToDTO(&entities[i], nil))
	}

	return result, &meta, nil
}

// Search busca clientes por coincidencia de texto rápido.
func (s *CustomerService) Search(ctx context.Context, actor *middlewares.ActorContext, query string, params utils.PageParams) ([]dtos.CustomerResponse, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	var companyID *int64
	if actor.ActorType != types.ActorSuperadmin {
		companyID = actor.CompanyID
	}

	filter := dtos.CustomerFilterQuery{
		CompanyID: companyID,
		Search:    strings.TrimSpace(query),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	return s.List(ctx, actor, filter)
}

// ListSelector devuelve la lista ligera de clientes para selector de venta rápida con el cliente mostrador por defecto al tope.
func (s *CustomerService) ListSelector(ctx context.Context, actor *middlewares.ActorContext, search string) ([]dtos.CustomerSelectorResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}

	return s.customerRepo.ListSelector(ctx, s.pool, companyID, search)
}

// GetByID obtiene el detalle completo del cliente incluyendo sus documentos.
func (s *CustomerService) GetByID(ctx context.Context, actor *middlewares.ActorContext, id int64) (*dtos.CustomerResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	entity, err := s.customerRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if entity == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != entity.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este cliente.")
		}
	}

	docs, err := s.customerRepo.ListDocuments(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar documentos del cliente.", err)
	}

	return s.mapCustomerToDTO(entity, docs), nil
}

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
		return nil, utils.Internal("Error al registrar cliente.", err)
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
		return nil, utils.Internal("Error al actualizar cliente.", err)
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
func (s *CustomerService) Delete(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
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

	if err := s.customerRepo.SoftDelete(ctx, s.pool, id); err != nil {
		return utils.Internal("Error al eliminar cliente.", err)
	}

	currentBytes, _ := json.Marshal(current)
	const recycleSQL = `
		INSERT INTO recycle_bin (
			company_id, entity_table, entity_id, entity_label, entity_data,
			deleted_by_actor_type, deleted_by_actor_id
		) VALUES ($1, 'customers', $2, $3, $4, $5, $6)
	`
	_, _ = s.pool.Exec(ctx, recycleSQL, current.CompanyID, current.ID, fmt.Sprintf("%s (%s)", current.Name, current.Document), currentBytes, string(actor.ActorType), actor.ActorID)

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customers",
		EntityID:  &current.ID,
		Action:    "CUSTOMER_DEACTIVATED",
		Reason:    "Retiro de la operación (soft-delete)",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// ==========================================
// MÉTODOS DE DOCUMENTOS ADJUNTOS
// ==========================================

func (s *CustomerService) ListDocuments(ctx context.Context, actor *middlewares.ActorContext, customerID int64) ([]dtos.CustomerDocumentDTO, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.customerRepo.FindByID(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este cliente.")
		}
	}

	entities, err := s.customerRepo.ListDocuments(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar documentos del cliente.", err)
	}

	dtosList := make([]dtos.CustomerDocumentDTO, 0, len(entities))
	for i := range entities {
		dtosList = append(dtosList, dtos.CustomerDocumentDTO{
			ID:         entities[i].ID,
			CustomerID: entities[i].CustomerID,
			DocType:    entities[i].DocType,
			FileName:   entities[i].FileName,
			FileURL:    entities[i].FileURL,
			MimeType:   entities[i].MimeType,
			Notes:      entities[i].Notes,
			UploadedAt: entities[i].UploadedAt,
		})
	}
	return dtosList, nil
}

func (s *CustomerService) UploadDocument(
	ctx context.Context,
	actor *middlewares.ActorContext,
	customerID int64,
	docType types.CustomerDocType,
	notes *string,
	fileName string,
	mimeType string,
	fileBytes []byte,
	ip, ua string,
) (*dtos.CustomerDocumentDTO, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.customerRepo.FindByID(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para subir documentos a este cliente.")
		}
	}

	// Directorio de destino: cfg.UploadsDir/customers/{customerID}/
	targetDir := filepath.Join(s.cfg.UploadsDir, "customers", fmt.Sprintf("%d", customerID))
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, utils.Internal("Error al preparar directorio de almacenamiento.", err)
	}

	timestampedName := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(fileName))
	filePath := filepath.Join(targetDir, timestampedName)
	if err := os.WriteFile(filePath, fileBytes, 0644); err != nil {
		return nil, utils.Internal("Error al guardar archivo en disco.", err)
	}

	fileURL := fmt.Sprintf("/uploads/customers/%d/%s", customerID, timestampedName)

	docEntity := &repositories.CustomerDocumentEntity{
		CustomerID: customerID,
		DocType:    docType,
		FileName:   fileName,
		FileURL:    fileURL,
		MimeType:   &mimeType,
		Notes:      notes,
	}

	created, err := s.customerRepo.CreateDocument(ctx, s.pool, docEntity)
	if err != nil {
		return nil, utils.Internal("Error al registrar documento adjunto.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customer_documents",
		EntityID:  &created.ID,
		Action:    "CUSTOMER_DOCUMENT_UPLOADED",
		Reason:    fmt.Sprintf("Subida de documento tipo: %s", docType),
		IPAddress: ip,
		UserAgent: ua,
	})

	return &dtos.CustomerDocumentDTO{
		ID:         created.ID,
		CustomerID: created.CustomerID,
		DocType:    created.DocType,
		FileName:   created.FileName,
		FileURL:    created.FileURL,
		MimeType:   created.MimeType,
		Notes:      created.Notes,
		UploadedAt: created.UploadedAt,
	}, nil
}

func (s *CustomerService) DeleteDocument(ctx context.Context, actor *middlewares.ActorContext, customerID, docID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.customerRepo.FindByID(ctx, s.pool, customerID)
	if err != nil {
		return utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este cliente.")
		}
	}

	doc, err := s.customerRepo.FindDocumentByID(ctx, s.pool, docID)
	if err != nil {
		return utils.Internal("Error al consultar documento.", err)
	}
	if doc == nil || doc.CustomerID != customerID {
		return utils.NotFound("DOCUMENT_NOT_FOUND", "El documento no pertenece a este cliente o no existe.")
	}

	if err := s.customerRepo.DeleteDocument(ctx, s.pool, docID); err != nil {
		return utils.Internal("Error al eliminar documento.", err)
	}

	// Borrar archivo físico si es posible (no bloqueante)
	physicalPath := filepath.Join(s.cfg.UploadsDir, strings.TrimPrefix(doc.FileURL, "/uploads/"))
	_ = os.Remove(physicalPath)

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customer_documents",
		EntityID:  &docID,
		Action:    "CUSTOMER_DOCUMENT_DELETED",
		Reason:    "Eliminación de documento adjunto",
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

func (s *CustomerService) mapCustomerToDTO(c *repositories.CustomerEntity, docs []repositories.CustomerDocumentEntity) *dtos.CustomerResponse {
	docsDTO := make([]dtos.CustomerDocumentDTO, 0, len(docs))
	for i := range docs {
		docsDTO = append(docsDTO, dtos.CustomerDocumentDTO{
			ID:         docs[i].ID,
			CustomerID: docs[i].CustomerID,
			DocType:    docs[i].DocType,
			FileName:   docs[i].FileName,
			FileURL:    docs[i].FileURL,
			MimeType:   docs[i].MimeType,
			Notes:      docs[i].Notes,
			UploadedAt: docs[i].UploadedAt,
		})
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

func (s *CustomerService) GetCreditStatus(ctx context.Context, companyID int64, customerID int64) (*dtos.CustomerCreditStatusResponse, error) {
	status, err := s.customerRepo.GetCreditStatusSummary(ctx, s.pool, customerID)
	if err != nil {
		return nil, utils.Internal("Error al consultar estado de crédito del cliente.", err)
	}
	if status == nil {
		return nil, utils.NotFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado o inactivo.")
	}
	return status, nil
}
