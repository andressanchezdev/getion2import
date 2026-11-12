package events

// catalog_test · el catálogo de eventos está completo: 48 tipos con canal, 19 kinds con permisos y todos los permisos existen en la semilla
// conecta con: catalog.go, types.go y core/types/permission_types.go (catálogo de permisos sembrado)

import (
	"testing"

	"importadoraApi/src/core/types"
)

const expectedTypes = 48

var masterKinds = []Kind{KindCompany, KindAdmin, KindWarehouse, KindWarehouseBilling, KindDocSeries, KindLocation, KindCustomer,
	KindCustomerDocument, KindSupplier, KindCarrier, KindBrand, KindCategory, KindModel, KindProduct, KindProductCode,
	KindProductSupplier, KindRole, KindEmployee, KindScreensaverSettings}

func TestEveryTypeHasRoute(t *testing.T) {
	if len(routes) != expectedTypes || len(bodies) != expectedTypes {
		t.Fatalf("hay %d rutas y %d cuerpos; deben ser %d", len(routes), len(bodies), expectedTypes)
	}
	for typ := range bodies {
		r, ok := routes[typ]
		if !ok {
			t.Errorf("%s no tiene ruta", typ)
			continue
		}
		if !r.System && !r.Company && !r.Warehouses && !r.Actor && !r.Platform {
			t.Errorf("%s no va a ningún canal", typ)
		}
	}
}

func TestEveryKindHasPermissions(t *testing.T) {
	if len(entityRoutes) != len(masterKinds) {
		t.Fatalf("entityRoutes tiene %d kinds; deben ser %d", len(entityRoutes), len(masterKinds))
	}
	for _, k := range masterKinds {
		if _, ok := entityRoutes[k]; !ok {
			t.Errorf("el kind %s no tiene canal ni permisos", k)
		}
	}
}

func TestPermissionsExistInSeed(t *testing.T) {
	catalog := types.PermissionCatalog()
	for _, k := range types.GovernancePermissions {
		catalog[k] = true
	}
	check := func(where string, perms []string) {
		for _, p := range perms {
			if !catalog[p] {
				t.Errorf("%s exige %s, que no está en el catálogo de permisos", where, p)
			}
		}
	}
	for typ, r := range routes {
		check(string(typ), r.Permissions)
	}
	for k, r := range entityRoutes {
		check("kind "+string(k), r.Permissions)
	}
}

// TestSuperadminOnlyByPlatform: por la decisión 2 nada de compañía llega al superadmin salvo lo marcado como plataforma
func TestRouteForEntityKinds(t *testing.T) {
	loc := RouteFor(EntityUpdated, KindLocation)
	if loc.Company || !loc.Warehouses {
		t.Error("las ubicaciones van por bodega")
	}
	if !RouteFor(EntityStatusChanged, KindCompany).Platform || RouteFor(EntityStatusChanged, KindCustomer).Platform {
		t.Error("solo compañía y admin van también a platform")
	}
	e := NewEntityStatus(1, nil, EntityRef{Kind: KindCustomer, ID: 2}, "active", "inactive", nil, map[string]any{})
	if e.CompanyID == nil || *e.CompanyID != 1 || len(e.Permissions) == 0 || e.Permissions[0] != "customers:view" {
		t.Errorf("entity.status_changed de cliente mal enrutado: %+v", e)
	}
	tr := NewTransferStatus(1, TransferStatusChangedData{OriginWarehouseID: 1, DestinationWarehouseID: 3})
	if len(tr.WarehouseIDs) != 2 || tr.WarehouseIDs[0] != 1 || tr.WarehouseIDs[1] != 3 {
		t.Errorf("el traslado debe ir a origen y destino: %v", tr.WarehouseIDs)
	}
	p := NewPersonal(CartUpdated, nil, "employee", 3, CartUpdatedData{Cart: map[string]any{}})
	if p.ActorChannel != "employee:3" {
		t.Errorf("canal personal: %q", p.ActorChannel)
	}
	if a := NewAuditLogged(nil, AuditLoggedData{}); !a.Platform {
		t.Error("la auditoría sin compañía va a platform")
	}
}

func TestValidateRejectsBadEvents(t *testing.T) {
	cases := map[string]Event{
		"tipo desconocido":       {Type: "x.y", Data: 1},
		"tipo de sistema":        {Type: SystemWatermark, Data: WatermarkData{}},
		"sin cuerpo":             New(StockChanged, InCompany(1), nil),
		"personal sin destino":   New(CartUpdated, InCompany(1), CartUpdatedData{}),
		"por bodega sin bodegas": New(TransferCreated, InCompany(1), TransferCreatedData{}),
	}
	for name, e := range cases {
		if err := validate(e); err == nil {
			t.Errorf("%s: debía rechazarse", name)
		}
	}
	if err := validate(NewTransferCreated(1, TransferRow{OriginWarehouseID: 1, DestinationWarehouseID: 2})); err != nil {
		t.Errorf("un traslado bien armado no debe rechazarse: %v", err)
	}
}
