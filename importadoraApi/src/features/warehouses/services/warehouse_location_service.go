package services

// warehouse_location_service · ubicaciones (estantes y pasillos) de la bodega
// conecta con: WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go)

import (
	authRepos "importadoraApi/src/features/auth/repositories"
	"context"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/repositories"

	"github.com/jackc/pgx/v5"
)

// ListLocations lista las ubicaciones de una bodega, validando que sea de la compañía del usuario.
func (s *WarehouseService) ListLocations(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64, activeOnly bool) ([]dtos.WarehouseLocationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	wh, err := s.warehouseRepo.FindByID(ctx, s.pool, warehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar bodega.", err)
	}
	if wh == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != wh.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso sobre esta bodega.")
		}
	}

	entities, err := s.warehouseRepo.ListLocations(ctx, s.pool, warehouseID, activeOnly)
	if err != nil {
		return nil, utils.Internal("Error al listar ubicaciones.", err)
	}

	res := make([]dtos.WarehouseLocationResponse, 0, len(entities))
	for i := range entities {
		res = append(res, *toLocationDTO(&entities[i]))
	}
	return res, nil
}

// CreateLocation crea una ubicación (estante o pasillo) en una bodega.
func (s *WarehouseService) CreateLocation(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64, req dtos.CreateWarehouseLocationRequest, ip, ua string) (*dtos.WarehouseLocationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		return nil, utils.BadRequest("INVALID_LOCATION_CODE", "El código de la ubicación es obligatorio.")
	}

	wh, err := s.warehouseRepo.FindByID(ctx, s.pool, warehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar bodega.", err)
	}
	if wh == nil {
		return nil, utils.NotFound("WAREHOUSE_NOT_FOUND", "La bodega no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != wh.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso sobre esta bodega.")
		}
	}

	entity := &repositories.WarehouseLocationEntity{
		CompanyID:   wh.CompanyID,
		WarehouseID: warehouseID,
		Code:        code,
		Description: req.Description,
	}

	created, err := s.warehouseRepo.CreateLocation(ctx, s.pool, entity)
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	return toLocationDTO(created), nil
}

// UpdateLocation actualiza una ubicación de la bodega.
func (s *WarehouseService) UpdateLocation(ctx context.Context, actor *middlewares.ActorContext, warehouseID, locationID int64, req dtos.UpdateWarehouseLocationRequest, ip, ua string) (*dtos.WarehouseLocationResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.warehouseRepo.FindLocationByID(ctx, s.pool, locationID)
	if err != nil {
		return nil, utils.Internal("Error al consultar ubicación.", err)
	}
	if current == nil || current.WarehouseID != warehouseID {
		return nil, utils.NotFound("LOCATION_NOT_FOUND", "La ubicación no existe en esta bodega.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso sobre esta bodega.")
		}
	}

	oldCode := current.Code
	if req.Code != nil && strings.TrimSpace(*req.Code) != "" {
		current.Code = strings.TrimSpace(*req.Code)
	}
	if req.Description != nil {
		current.Description = req.Description
	}
	if _, rerr := utils.ReasonOnDeactivation(current.IsActive, req.IsActive, req.Reason); rerr != nil {
		return nil, rerr
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	// ojo: el stock guarda el código de la ubicación; al renombrarla se mueve todo en la misma transacción para que ningún producto quede apuntando a un código que ya no existe
	var updated *repositories.WarehouseLocationEntity
	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		saved, err := s.warehouseRepo.UpdateLocation(ctx, tx, current)
		if err != nil {
			return err
		}
		updated = saved
		if current.Code != oldCode {
			return s.warehouseRepo.RenameStockLocation(ctx, tx, warehouseID, oldCode, current.Code)
		}
		return nil
	})
	if err != nil {
		return nil, utils.NormalizeDBError(err, "")
	}

	return toLocationDTO(updated), nil
}

// DeleteLocation elimina una ubicación de la bodega solo si no tiene existencias.
func (s *WarehouseService) DeleteLocation(ctx context.Context, actor *middlewares.ActorContext, warehouseID, locationID int64, reason, ip, ua string) error {
	reason, verr := utils.ValidateReason(reason)
	if verr != nil {
		return verr
	}
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	current, err := s.warehouseRepo.FindLocationByID(ctx, s.pool, locationID)
	if err != nil {
		return utils.Internal("Error al consultar ubicación.", err)
	}
	if current == nil || current.WarehouseID != warehouseID {
		return utils.NotFound("LOCATION_NOT_FOUND", "La ubicación no existe en esta bodega.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != current.CompanyID {
			return utils.Forbidden("FORBIDDEN_WAREHOUSE_ACCESS", "No tienes permiso sobre esta bodega.")
		}
	}

	// VALIDACIÓN ESTRICTA: No se puede eliminar si tiene existencias físicas o reservadas
	stockCount, err := s.warehouseRepo.CountStockInLocation(ctx, s.pool, warehouseID, current.Code)
	if err != nil {
		return utils.Internal("Error al verificar inventario en la ubicación.", err)
	}
	if stockCount > 0 {
		return utils.Conflict("LOCATION_NOT_EMPTY", fmt.Sprintf("No se puede eliminar la ubicación '%s' porque cuenta con %d unidades almacenadas. Debe reubicar los productos antes de eliminarla.", current.Code, stockCount))
	}

	if err := s.warehouseRepo.DeleteLocation(ctx, s.pool, locationID); err != nil {
		return utils.Internal("Error al inactivar la ubicación.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &current.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "warehouse_locations",
		EntityID:  &locationID,
		Action:    "LOCATION_DEACTIVATED",
		Reason:    reason,
		IPAddress: ip,
		UserAgent: ua,
	})
	return nil
}

// toLocationDTO arma la respuesta de una ubicación con lo que guarda.
func toLocationDTO(l *repositories.WarehouseLocationEntity) *dtos.WarehouseLocationResponse {
	status := l.Status
	if status == "" {
		if l.Units > 0 {
			status = "ocupada"
		} else {
			status = "libre"
		}
	}
	return &dtos.WarehouseLocationResponse{
		ID:           l.ID,
		CompanyID:    l.CompanyID,
		WarehouseID:  l.WarehouseID,
		Code:         l.Code,
		QRCode:       l.QRCode,
		Status:       status,
		Description:  l.Description,
		IsActive:     l.IsActive,
		ProductCount: l.ProductCount,
		Units:        l.Units,
		CreatedAt:    l.CreatedAt,
		UpdatedAt:    l.UpdatedAt,
	}
}
