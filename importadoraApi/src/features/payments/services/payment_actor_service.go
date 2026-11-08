package services

// payment_actor_service.go · saber qué empleado deja constancia de una acción sobre un pago: el empleado mismo o el ligado al administrador
// conecta con: payment_service y payment_flow_service (crear, cobro mixto, verificar y anular); usa SaleRepository.LinkedEmployeeOfAdmin
// ojo: el id del token es el de la tabla del actor (admins o employees); las columnas de pagos apuntan a employees, por eso no se pueden mezclar

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
)

// actorEmployeeID devuelve el empleado de quien hace la petición: el suyo si es empleado, el ligado si es administrador y 0 si no tiene (superadmin o administrador sin empleado)
func (s *PaymentService) actorEmployeeID(ctx context.Context, actor *middlewares.ActorContext) (int64, error) {
	if actor == nil {
		return 0, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	switch actor.ActorType {
	case types.ActorEmployee:
		return actor.ActorID, nil
	case types.ActorAdmin:
		id, err := s.saleRepo.LinkedEmployeeOfAdmin(ctx, s.pool, actor.ActorID)
		if err != nil {
			return 0, utils.Internal("Error al buscar el empleado ligado a tu cuenta.", err)
		}
		return id, nil
	default:
		return 0, nil
	}
}

// requireActorEmployeeID es actorEmployeeID para verificar o anular, que dejan constancia de quién las hizo: sin empleado ligado se rechazan con un mensaje claro
func (s *PaymentService) requireActorEmployeeID(ctx context.Context, actor *middlewares.ActorContext) (int64, error) {
	id, err := s.actorEmployeeID(ctx, actor)
	if err != nil {
		return 0, err
	}
	if id <= 0 {
		return 0, utils.BadRequest("ACTOR_WITHOUT_EMPLOYEE", "Tu cuenta no está ligada a un empleado, por eso no puede registrar esta acción. Pide que la liguen a un empleado de la compañía.")
	}
	return id, nil
}
