package services

// purchase_catalog_service.go · alta y baja manual de productos en el catálogo de un proveedor (product_suppliers), además de la carga por Excel
// conecta con: PurchaseRepository (catálogo), ExternalRepository (proveedor) y AuditRepository; lo llama purchase_controller
// ojo: el catálogo es de la compañía; la orden de compra solo acepta productos que el proveedor tiene aquí

import (
	"context"
	"fmt"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	externalrepos "importadoraApi/src/features/externals/repositories"
	"importadoraApi/src/features/purchases/dtos"
)

// loadCatalogSupplier trae el proveedor y valida que sea de la compañía de quien lo toca y que de verdad sea proveedor.
func (s *PurchaseService) loadCatalogSupplier(ctx context.Context, actor *middlewares.ActorContext, supplierID int64) (*externalrepos.ExternalEntity, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}
	supplier, err := s.externalRepo.FindByID(ctx, s.pool, supplierID)
	if err != nil {
		return nil, utils.Internal("Error al consultar proveedor.", err)
	}
	if supplier == nil {
		return nil, utils.NotFound("SUPPLIER_NOT_FOUND", "El proveedor no existe.")
	}
	if actor.ActorType != types.ActorSuperadmin && (actor.CompanyID == nil || *actor.CompanyID != supplier.CompanyID) {
		return nil, utils.Forbidden("FORBIDDEN_COMPANY_ACCESS", "No tienes permiso sobre este proveedor.")
	}
	if string(supplier.Kind) != "supplier" {
		return nil, utils.BadRequest("NOT_A_SUPPLIER", "Solo los proveedores tienen catálogo de productos.")
	}
	return supplier, nil
}

// SaveSupplierProduct agrega un producto de la compañía al catálogo del proveedor o actualiza su costo; devuelve el catálogo completo.
func (s *PurchaseService) SaveSupplierProduct(ctx context.Context, actor *middlewares.ActorContext, supplierID int64, req dtos.SaveSupplierProductRequest, ip, ua string) ([]dtos.SupplierProductItemDTO, error) {
	supplier, err := s.loadCatalogSupplier(ctx, actor, supplierID)
	if err != nil {
		return nil, err
	}
	if req.ProductID <= 0 {
		return nil, utils.BadRequest("MISSING_PRODUCT", "El producto es requerido.")
	}
	if req.Cost < 0 {
		return nil, utils.BadRequest("INVALID_COST", "El costo no puede ser negativo.")
	}
	companyID, err := s.purchaseRepo.ProductCompany(ctx, s.pool, req.ProductID)
	if err != nil || companyID != supplier.CompanyID {
		return nil, utils.NotFound("PRODUCT_NOT_FOUND", "El producto no existe o no pertenece a la compañía.")
	}
	if err := s.purchaseRepo.UpsertSupplierProduct(ctx, s.pool, req.ProductID, supplierID, req.Cost, req.SupplierCode); err != nil {
		return nil, utils.Internal("Error al guardar el producto del proveedor.", err)
	}
	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &supplier.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "externals", EntityID: &supplierID, Action: "SUPPLIER_PRODUCT_SAVED",
		Reason: fmt.Sprintf("Producto %d en el catálogo de %s a costo %.0f", req.ProductID, supplier.Name, req.Cost), IPAddress: ip, UserAgent: ua,
	})
	return s.purchaseRepo.ListSupplierProducts(ctx, s.pool, supplierID)
}

// DeleteSupplierProduct quita un producto del catálogo del proveedor.
func (s *PurchaseService) DeleteSupplierProduct(ctx context.Context, actor *middlewares.ActorContext, supplierID, productID int64, ip, ua string) error {
	supplier, err := s.loadCatalogSupplier(ctx, actor, supplierID)
	if err != nil {
		return err
	}
	removed, err := s.purchaseRepo.DeleteSupplierProduct(ctx, s.pool, supplierID, productID)
	if err != nil {
		return utils.Internal("Error al quitar el producto del proveedor.", err)
	}
	if !removed {
		return utils.NotFound("SUPPLIER_PRODUCT_NOT_FOUND", "Ese producto no está en el catálogo del proveedor.")
	}
	_ = s.auditRepo.Insert(ctx, s.pool, authRepos.AuditLogInput{
		CompanyID: &supplier.CompanyID, ActorType: actor.ActorType, ActorID: actor.ActorID,
		Entity: "externals", EntityID: &supplierID, Action: "SUPPLIER_PRODUCT_REMOVED",
		Reason: fmt.Sprintf("Producto %d quitado del catálogo de %s", productID, supplier.Name), IPAddress: ip, UserAgent: ua,
	})
	return nil
}
