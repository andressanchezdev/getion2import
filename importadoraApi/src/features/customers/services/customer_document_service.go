package services

// customer_document_service · documentos del cliente: listar, subir y eliminar
// conecta con: CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go)

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/repositories"
)

// ListDocuments lista los documentos según los filtros y lo que el usuario puede ver.
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

	now := time.Now()
	dtosList := make([]dtos.CustomerDocumentDTO, 0, len(entities))
	for i := range entities {
		dtosList = append(dtosList, toDocumentDTO(entities[i], current.DocsValidityMonths, now))
	}
	return dtosList, nil
}

// UploadDocument sube un documento del cliente (por ejemplo el RUT), lo guarda en el almacenamiento y registra su vigencia.
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

	res := toDocumentDTO(*created, current.DocsValidityMonths, time.Now())
	return &res, nil
}

// DeleteDocument elimina el documento validando que sea de la compañía del usuario.
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
