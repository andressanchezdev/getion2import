package services

// customer_document_expiry · vigencia de los documentos del cliente: cuándo vencen y en qué estado están
// conecta con: CustomerService (listar, subir, renovar y alertas); la vigencia en meses sale del cliente (docs_validity_months)

import (
	"time"

	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/repositories"
)

// Estados de vigencia de un documento.
const (
	DocStatusValid    = "valid"    // vigente
	DocStatusExpiring = "expiring" // vence en los próximos días
	DocStatusExpired  = "expired"  // vencido
)

// DocExpiringSoonDays son los días de aviso antes del vencimiento.
const DocExpiringSoonDays = 30

// documentExpiry calcula la fecha de vencimiento (subida + meses de vigencia), el estado y los días que faltan (negativo si ya venció).
func documentExpiry(uploadedAt time.Time, validityMonths int, now time.Time) (time.Time, string, int) {
	if validityMonths <= 0 {
		validityMonths = 12
	}
	expiresAt := uploadedAt.AddDate(0, validityMonths, 0)
	daysLeft := int(expiresAt.Sub(now).Hours() / 24)
	if expiresAt.Before(now) {
		return expiresAt, DocStatusExpired, daysLeft
	}
	if daysLeft <= DocExpiringSoonDays {
		return expiresAt, DocStatusExpiring, daysLeft
	}
	return expiresAt, DocStatusValid, daysLeft
}

// toDocumentDTO arma la respuesta de un documento con su vencimiento y estado.
func toDocumentDTO(e repositories.CustomerDocumentEntity, validityMonths int, now time.Time) dtos.CustomerDocumentDTO {
	expiresAt, status, daysLeft := documentExpiry(e.UploadedAt, validityMonths, now)
	return dtos.CustomerDocumentDTO{
		ID:         e.ID,
		CustomerID: e.CustomerID,
		DocType:    e.DocType,
		FileName:   e.FileName,
		FileURL:    e.FileURL,
		MimeType:   e.MimeType,
		Notes:      e.Notes,
		UploadedAt: e.UploadedAt,
		ExpiresAt:  expiresAt,
		Status:     status,
		DaysLeft:   daysLeft,
	}
}
