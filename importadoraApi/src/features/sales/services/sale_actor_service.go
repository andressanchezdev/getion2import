package services

// sale_actor_service.go · saber qué empleado hace una acción sobre un pedido: el empleado mismo, o el empleado ligado al administrador
// conecta con: sale_controller (lo llama en cada acción) y el repositorio de ventas (consulta admins.employee_id)
// ojo: el id del token es el de la tabla del actor (admins o employees); las columnas de pedidos, pagos y etapas apuntan a employees, por eso no se pueden mezclar

import (
	"context"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
)

// ActorEmployeeID devuelve el id de empleado de quien hace la petición: el suyo si es empleado, el ligado si es administrador y 0 si no tiene (superadmin o administrador sin empleado)
func (s *SaleService) ActorEmployeeID(ctx context.Context, actor *middlewares.ActorContext) (int64, error) {
	if actor == nil {
		return 0, utils.Unauthorized("UNAUTHORIZED", "Actor no autenticado.")
	}
	switch actor.ActorType {
	case types.ActorEmployee:
		return actor.ActorID, nil
	case types.ActorAdmin:
		return s.saleRepo.LinkedEmployeeOfAdmin(ctx, s.pool, actor.ActorID)
	default:
		return 0, nil
	}
}

// RequireActorEmployeeID es ActorEmployeeID para las acciones que dejan constancia de quién las hizo (etapas, facturas, cancelaciones): sin empleado ligado se rechazan con un mensaje claro
func (s *SaleService) RequireActorEmployeeID(ctx context.Context, actor *middlewares.ActorContext) (int64, error) {
	id, err := s.ActorEmployeeID(ctx, actor)
	if err != nil {
		return 0, err
	}
	if id <= 0 {
		return 0, utils.BadRequest("ACTOR_WITHOUT_EMPLOYEE", "Tu cuenta no está ligada a un empleado, por eso no puede registrar esta acción. Pide que la liguen a un empleado de la compañía.")
	}
	return id, nil
}
