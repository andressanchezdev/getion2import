package services

// sale_annul_service · anulación de facturas emitidas, con motivo y auditoría
// conecta con: SaleService (mismo servicio, repartido por responsabilidad); usa SaleRepository.AnnulInvoice y AuditRepository

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
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

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

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
	return tx.Commit(ctx)
}
