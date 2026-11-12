package services

// product_supplier_service · proveedores del producto y su costo
// conecta con: ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go)

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"time"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/products/dtos"
)

// ListSuppliers lista los proveedores de un producto, validando que sea de la compañía del usuario.
func (s *ProductService) ListSuppliers(ctx context.Context, actor *middlewares.ActorContext, productID int64) ([]dtos.ProductSupplierResponse, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para consultar este producto.")
		}
	}

	entities, err := s.productRepo.ListSuppliers(ctx, s.pool, productID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedores del producto.", err)
	}

	res := make([]dtos.ProductSupplierResponse, 0, len(entities))
	for i := range entities {
		res = append(res, dtos.ProductSupplierResponse{
			ProductID:    entities[i].ProductID,
			SupplierID:   entities[i].SupplierID,
			SupplierName: entities[i].SupplierName,
			Cost:         entities[i].Cost,
			SupplierCode: entities[i].SupplierCode,
		})
	}
	return res, nil
}

// AssignSupplier liga un proveedor a un producto con su costo y deja el cambio en auditoría.
func (s *ProductService) AssignSupplier(ctx context.Context, actor *middlewares.ActorContext, productID int64, req dtos.AssignProductSupplierRequest, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este producto.")
		}
	}

	if err := s.productRepo.AssignSupplier(ctx, s.pool, productID, req.SupplierID, req.Cost, req.SupplierCode); err != nil {
		return utils.Internal("Error al asignar proveedor al producto.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_suppliers",
		EntityID:  &productID,
		Action:    "PRODUCT_SUPPLIER_ASSIGNED",
		Reason:    fmt.Sprintf("Asignación de proveedor ID %d con costo %.2f", req.SupplierID, req.Cost),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}

// RemoveSupplier desliga un proveedor de un producto y deja el cambio en auditoría.
func (s *ProductService) RemoveSupplier(ctx context.Context, actor *middlewares.ActorContext, productID, supplierID int64, ip, ua string) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	product, err := s.productRepo.FindByID(ctx, s.pool, productID)
	if err != nil {
		return utils.Internal("Error al consultar producto.", err)
	}
	if product == nil {
		return utils.NotFound("PRODUCT_NOT_FOUND", "El producto solicitado no existe.")
	}

	if actor.ActorType != types.ActorSuperadmin {
		if actor.CompanyID == nil || *actor.CompanyID != product.CompanyID {
			return utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso para modificar este producto.")
		}
	}

	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.productRepo.RemoveSupplier(ctx, tx, productID, supplierID); err != nil {
			return err
		}
		s.events.Record(ctx, events.NewEntityDeleted(product.CompanyID, nil, events.EntityRef{Kind: events.KindProductSupplier, ID: productID, Version: time.Now().UTC()}, &events.EntityParent{Kind: events.KindSupplier, ID: supplierID}))
		return nil
	})
	if err != nil {
		return utils.Internal("Error al desvincular proveedor.", err)
	}

	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &product.CompanyID,
		ActorType: actor.ActorType,
		ActorID:   actor.ActorID,
		Entity:    "product_suppliers",
		EntityID:  &productID,
		Action:    "PRODUCT_SUPPLIER_REMOVED",
		Reason:    fmt.Sprintf("Desvinculación de proveedor ID %d", supplierID),
		IPAddress: ip,
		UserAgent: ua,
	})

	return nil
}
