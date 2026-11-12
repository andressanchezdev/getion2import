package features_test

// tenant_integration_test · prueba contra PostgreSQL real el aislamiento entre compañías en ventas y facturas,
// la lectura de carritos sin caducidad y la auditoría de la anulación (todo sin dejar cambios: la escritura se revierte)
// ojo: solo corre si TEST_DATABASE_URL está definida

import (
	"context"
	"testing"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	authRepos "importadoraApi/src/features/auth/repositories"
	cartRepos "importadoraApi/src/features/carts/repositories"
	inventoryRepos "importadoraApi/src/features/inventory/repositories"
	saleRepos "importadoraApi/src/features/sales/repositories"
	saleServices "importadoraApi/src/features/sales/services"
)

func newSaleService(t *testing.T) (*saleServices.SaleService, func(context.Context) error) {
	t.Helper()
	pool := testPool(t)
	svc := saleServices.NewSaleService(pool, saleRepos.NewSaleRepository(), inventoryRepos.NewInventoryRepository(), authRepos.NewAuditRepository(), nil)
	return svc, func(ctx context.Context) error { return pool.Ping(ctx) }
}

func TestSaleAndInvoiceAreScopedByCompany(t *testing.T) {
	svc, _ := newSaleService(t)
	ctx := context.Background()
	const myCompany, otherCompany = int64(1), int64(999)

	if _, err := svc.FindByID(ctx, myCompany, 1); err != nil {
		t.Fatalf("el pedido 1 debería verse desde su compañía: %v", err)
	}
	if _, err := svc.FindByID(ctx, otherCompany, 1); err == nil {
		t.Error("otra compañía NO debería ver el pedido 1")
	}
	if _, err := svc.AdvanceToVerification(ctx, otherCompany, 1, 1); err == nil {
		t.Error("otra compañía NO debería poder avanzar el pedido 1")
	}
	if _, err := svc.FindInvoiceByID(ctx, myCompany, 1); err != nil {
		t.Fatalf("la factura 1 debería verse desde su compañía: %v", err)
	}
	if _, err := svc.FindInvoiceByID(ctx, otherCompany, 1); err == nil {
		t.Error("otra compañía NO debería ver la factura 1")
	}

	actor := &middlewares.ActorContext{ActorType: types.ActorAdmin, ActorID: 1}
	if err := svc.AnnulInvoice(ctx, actor, otherCompany, 1, "motivo suficientemente largo", "127.0.0.1", "test"); err == nil {
		t.Error("otra compañía NO debería poder anular la factura 1")
	}
	if err := svc.AnnulInvoice(ctx, actor, myCompany, 1, "corto", "127.0.0.1", "test"); err == nil {
		t.Error("un motivo de menos de 10 caracteres debería rechazarse")
	}
}

func TestCartsReadWithoutExpiry(t *testing.T) {
	pool := testPool(t)
	repo := cartRepos.NewCartRepository()
	cart, err := repo.FindActiveByEmployee(context.Background(), pool, 1, 1)
	if err != nil {
		t.Fatalf("la consulta del carrito activo falló contra el esquema real: %v", err)
	}
	t.Logf("carrito activo del empleado 1: %v", cart != nil)
	if _, err := repo.FindByID(context.Background(), pool, 32); err != nil {
		t.Fatalf("leer un carrito existente falló: %v", err)
	}
}

func TestAnnulmentAuditRowIsAccepted(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)

	id, company := int64(1), int64(1)
	err = authRepos.NewAuditRepository().Insert(ctx, tx, authRepos.AuditLogInput{
		CompanyID: &company, ActorType: types.ActorAdmin, ActorID: 1, Entity: "invoices", EntityID: &id,
		Action: "INVOICE_ANNULLED", Reason: "prueba de anulación", IPAddress: "127.0.0.1", UserAgent: "test",
	})
	if err != nil {
		t.Fatalf("la base rechazó la fila de auditoría de la anulación: %v", err)
	}
	if err := saleRepos.NewSaleRepository().AnnulInvoice(ctx, tx, 1); err != nil {
		t.Fatalf("la base rechazó el cambio de estado a anulada: %v", err)
	}
}
