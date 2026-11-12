package services

// customer_document_service · documentos del cliente: listar, subir y eliminar
// conecta con: CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go)

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
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

	// el documento y su evento van en la misma transacción
	created, err := db.WithTxValue(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) (*repositories.CustomerDocumentEntity, error) {
		row, err := s.customerRepo.CreateDocument(ctx, tx, docEntity)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityCreated(current.CompanyID, nil, events.EntityRef{Kind: events.KindCustomerDocument, ID: row.ID, Version: time.Now().UTC()}, toDocumentDTO(*row, current.DocsValidityMonths, time.Now())))
		return row, nil
	})
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

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.customerRepo.DeleteDocument(ctx, tx, docID); err != nil {
			return err
		}
		s.events.Record(ctx, events.NewEntityDeleted(current.CompanyID, nil, events.EntityRef{Kind: events.KindCustomerDocument, ID: docID, Version: time.Now().UTC()}, &events.EntityParent{Kind: events.KindCustomer, ID: customerID}))
		return nil
	})
	if err != nil {
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

// DocumentFile resuelve la ruta física de un documento para servirlo por GET /customers/:id/documents/:docId/file.
// ojo: reemplaza el antiguo e.Static("/uploads") público; exige compañía del actor y que la ruta quede dentro de UploadsDir
func (s *CustomerService) DocumentFile(ctx context.Context, actor *middlewares.ActorContext, customerID, docID int64) (path, fileName string, err error) {
	if actor == nil {
		return "", "", utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	current, err := s.customerRepo.FindByID(ctx, s.pool, customerID)
	if err != nil {
		return "", "", utils.Internal("Error al consultar cliente.", err)
	}
	if current == nil {
		return "", "", utils.NotFound("CUSTOMER_NOT_FOUND", "El cliente solicitado no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return "", "", utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este cliente.")
		}
	}
	doc, err := s.customerRepo.FindDocumentByID(ctx, s.pool, docID)
	if err != nil {
		return "", "", utils.Internal("Error al consultar documento.", err)
	}
	if doc == nil || doc.CustomerID != customerID {
		return "", "", utils.NotFound("DOCUMENT_NOT_FOUND", "El documento no pertenece a este cliente o no existe.")
	}
	root, err := filepath.Abs(s.cfg.UploadsDir)
	if err != nil {
		return "", "", utils.Internal("No se pudo resolver la carpeta de archivos.", err)
	}
	full, err := filepath.Abs(filepath.Join(root, strings.TrimPrefix(doc.FileURL, "/uploads/")))
	if err != nil || !strings.HasPrefix(full, root+string(filepath.Separator)) {
		return "", "", utils.NotFound("DOCUMENT_FILE_NOT_FOUND", "El archivo del documento no está disponible.")
	}
	if _, statErr := os.Stat(full); statErr != nil {
		return "", "", utils.NotFound("DOCUMENT_FILE_NOT_FOUND", "El archivo del documento no está disponible.")
	}
	return full, doc.FileName, nil
}
