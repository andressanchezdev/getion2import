package services

// payment_status_service.go · rechazar un pago en revisión (con motivo) y reabrirlo para revisión; son los dos cambios de estado que no son verificar ni anular
// conecta con: PaymentRepository (Reject y Reopen), AuditRepository (quién y por qué) y syncVerificationStage; lo llama el controller de pagos
// ojo: rechazar exige motivo de 10 a 100 caracteres y reevalúa la etapa del pedido; reabrir solo aplica a pagos rechazados y los devuelve a «en revisión»

import (
	"context"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/payments/dtos"
	"importadoraApi/src/features/payments/repositories"
)

// loadForStatusChange trae el pago y valida que sea de la compañía de quien lo cambia.
func (s *PaymentService) loadForStatusChange(ctx context.Context, actor *middlewares.ActorContext, id int64) (*repositories.PaymentEntity, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	p, err := s.paymentRepo.FindByID(ctx, s.pool, id)
	if err != nil {
		return nil, utils.Internal("Error al consultar pago.", err)
	}
	if p == nil {
		return nil, utils.NotFound("PAYMENT_NOT_FOUND", "El pago solicitado no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin && (actor.CompanyID == nil || *actor.CompanyID != p.CompanyID) {
		return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este pago.")
	}
	return p, nil
}

// Reject marca un pago en revisión como rechazado (con novedad) y reevalúa la etapa del pedido.
func (s *PaymentService) Reject(ctx context.Context, actor *middlewares.ActorContext, id int64, req dtos.RejectPaymentRequest, ip, ua string) (*dtos.PaymentResponse, error) {
	reason, verr := utils.ValidateReason(req.Reason)
	if verr != nil {
		return nil, verr
	}
	p, err := s.loadForStatusChange(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	if p.Status != types.PaymentStatusReview {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("Solo se pueden rechazar pagos en revisión. Estado actual: '%s'.", p.Status))
	}
	rejecterID, aerr := s.requireActorEmployeeID(ctx, actor)
	if aerr != nil {
		return nil, aerr
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, utils.Internal("Error al iniciar la transacción del rechazo.", err)
	}
	defer tx.Rollback(ctx)
	if err := s.paymentRepo.Reject(ctx, tx, id, rejecterID, reason); err != nil {
		return nil, utils.Internal("Error al rechazar el pago.", err)
	}
	if err := s.syncVerificationStage(ctx, tx, p.SaleID, rejecterID); err != nil {
		return nil, utils.Internal("Error al actualizar la etapa del pedido.", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, utils.Internal("Error al confirmar el rechazo.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "payments", EntityID: &p.ID, Action: "PAYMENT_REJECTED",
		Reason: fmt.Sprintf("Pago %s rechazado: %s", p.SerialCode, reason), IPAddress: ip, UserAgent: ua,
	})
	return s.FindByID(ctx, actor, id)
}

// Reopen devuelve un pago rechazado a «en revisión» para volver a revisarlo.
func (s *PaymentService) Reopen(ctx context.Context, actor *middlewares.ActorContext, id int64, ip, ua string) (*dtos.PaymentResponse, error) {
	p, err := s.loadForStatusChange(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	if p.Status != types.PaymentStatusIssue {
		return nil, utils.BadRequest("INVALID_STATUS", fmt.Sprintf("Solo se pueden reabrir pagos rechazados. Estado actual: '%s'.", p.Status))
	}
	if err := s.paymentRepo.Reopen(ctx, s.pool, id); err != nil {
		return nil, utils.Internal("Error al reabrir el pago.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &p.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "payments", EntityID: &p.ID, Action: "PAYMENT_REOPENED",
		Reason: fmt.Sprintf("Pago %s devuelto a revisión", p.SerialCode), IPAddress: ip, UserAgent: ua,
	})
	return s.FindByID(ctx, actor, id)
}
