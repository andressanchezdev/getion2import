package services

// sale_annul_service · anulación de facturas emitidas, con motivo y auditoría
// conecta con: SaleService (mismo servicio, repartido por responsabilidad); usa SaleRepository.AnnulInvoice y AuditRepository

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"

	"github.com/jackc/pgx/v5"
)

// AnnulInvoice anula una factura emitida de la compañía del usuario (companyID 0 = superadmin sin límite).
// ojo: solo cambia el estado de la factura; las devoluciones de mercancía siguen su propio flujo
func (s *SaleService) AnnulInvoice(ctx context.Context, actor *middlewares.ActorContext, companyID, invoiceID int64, reason, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	reason, err := utils.ValidateReason(reason)
	if err != nil {
		return err
	}

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		inv, err := s.saleRepo.FindInvoiceByID(ctx, tx, invoiceID)
		if err != nil {
			return err
		}
		if inv == nil || (companyID > 0 && inv.CompanyID != companyID) {
			return utils.NotFound("INVOICE_NOT_FOUND", "La factura no existe.")
		}
		if inv.Status == types.InvoiceStatus("annulled") {
			return utils.Conflict("INVOICE_ALREADY_ANNULLED", "La factura ya está anulada.")
		}
		if inv.Status != types.InvoiceStatus("issued") {
			return utils.Conflict("INVOICE_NOT_ISSUED", "Solo se pueden anular facturas emitidas.")
		}

		if err := s.saleRepo.AnnulInvoice(ctx, tx, invoiceID); err != nil {
			return utils.NormalizeDBError(err, "No se pudo anular la factura.")
		}
		s.events.Record(ctx, events.NewInvoiceAnnulled(inv.CompanyID, inv.WarehouseID, events.InvoiceAnnulledData{
			Entity: events.EntityRef{
				Kind:    "invoice",
				ID:      invoiceID,
				Version: time.Now().UTC(),
			},
			SaleID: inv.SaleID,
			Reason: reason,
		}))
		if err := s.auditRepo.Insert(ctx, tx, authRepos.AuditLogInput{
			CompanyID: &inv.CompanyID,
			ActorType: actor.ActorType,
			ActorID:   actor.ActorID,
			Entity:    "invoices",
			EntityID:  &invoiceID,
			Action:    "INVOICE_ANNULLED",
			Reason:    reason,
			IPAddress: ip,
			UserAgent: ua,
		}); err != nil {
			return utils.Internal("No se pudo registrar la anulación en la auditoría.", err)
		}
		return nil
	})
}
