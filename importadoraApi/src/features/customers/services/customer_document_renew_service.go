package services

// customer_document_renew_service · renovación de documentos del cliente y alertas de los vencidos o por vencer
// conecta con: CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go); customer_document_expiry (estados) y el repositorio de documentos

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
)

// RenewDocument renueva un documento vencido o por vencer: reinicia su vigencia y, si llega un archivo nuevo, reemplaza el anterior.
func (s *CustomerService) RenewDocument(
	ctx context.Context,
	actor *middlewares.ActorContext,
	customerID, docID int64,
	notes *string,
	fileName, mimeType string,
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
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este cliente.")
		}
	}

	doc, err := s.customerRepo.FindDocumentByID(ctx, s.pool, docID)
	if err != nil {
		return nil, utils.Internal("Error al consultar documento.", err)
	}
	if doc == nil || doc.CustomerID != customerID {
		return nil, utils.NotFound("DOCUMENT_NOT_FOUND", "El documento no pertenece a este cliente o no existe.")
	}

	oldURL := doc.FileURL
	if len(fileBytes) > 0 {
		targetDir := filepath.Join(s.cfg.UploadsDir, "customers", fmt.Sprintf("%d", customerID))
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return nil, utils.Internal("Error al preparar directorio de almacenamiento.", err)
		}
		storedName := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(fileName))
		if err := os.WriteFile(filepath.Join(targetDir, storedName), fileBytes, 0644); err != nil {
			return nil, utils.Internal("Error al guardar archivo en disco.", err)
		}
		doc.FileName = fileName
		doc.FileURL = fmt.Sprintf("/uploads/customers/%d/%s", customerID, storedName)
		doc.MimeType = &mimeType
	}
	if notes != nil {
		doc.Notes = notes
	}

	renewed, err := s.customerRepo.RenewDocument(ctx, s.pool, doc)
	if err != nil {
		return nil, utils.Internal("Error al renovar el documento.", err)
	}

	if doc.FileURL != oldURL {
		_ = os.Remove(filepath.Join(s.cfg.UploadsDir, strings.TrimPrefix(oldURL, "/uploads/")))
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "customer_documents",
		EntityID:  &docID,
		Action:    "CUSTOMER_DOCUMENT_RENEWED",
		Reason:    fmt.Sprintf("Renovación de documento tipo: %s", renewed.DocType),
		IPAddress: ip,
		UserAgent: ua,
	})

	res := toDocumentDTO(*renewed, current.DocsValidityMonths, time.Now())
	return &res, nil
}

// ListDocumentAlerts lista los documentos vencidos o que vencen pronto de los clientes activos de la compañía, los más urgentes primero.
func (s *CustomerService) ListDocumentAlerts(ctx context.Context, actor *middlewares.ActorContext) ([]dtos.CustomerDocumentAlertDTO, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	if actor.CompanyID == nil {
		return []dtos.CustomerDocumentAlertDTO{}, nil
	}

	rows, err := s.customerRepo.ListDocumentAlerts(ctx, s.pool, *actor.CompanyID, DocExpiringSoonDays)
	if err != nil {
		return nil, utils.Internal("Error al consultar los documentos por vencer.", err)
	}

	now := time.Now()
	alerts := make([]dtos.CustomerDocumentAlertDTO, 0, len(rows))
	for _, row := range rows {
		expiresAt, status, daysLeft := documentExpiry(row.UploadedAt, row.ValidityMonths, now)
		alerts = append(alerts, dtos.CustomerDocumentAlertDTO{
			DocumentID:       row.DocumentID,
			CustomerID:       row.CustomerID,
			CustomerName:     row.CustomerName,
			CustomerDocument: row.CustomerDocument,
			DocType:          row.DocType,
			FileName:         row.FileName,
			ExpiresAt:        expiresAt,
			Status:           status,
			DaysLeft:         daysLeft,
		})
	}
	return alerts, nil
}
