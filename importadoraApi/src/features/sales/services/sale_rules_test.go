package services

// sale_rules_test · pruebas de las reglas puras del pedido: validación de la petición de crear y orden de las etapas
// conecta con: sale_validation.go y sale_stage_rules.go

import (
	"errors"
	"testing"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/repositories"
)

func f64(v float64) *float64 { return &v }
func i64(v int64) *int64     { return &v }

func validRequest() dtos.CreateSaleRequest {
	return dtos.CreateSaleRequest{
		WarehouseID:   1,
		PaymentMethod: types.PaymentCash,
		Items:         []dtos.CreateSaleItemRequest{{StockID: 10, Quantity: 2, UnitPrice: f64(1000)}},
	}
}

func errorCode(t *testing.T, err error) string {
	t.Helper()
	var appErr *utils.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("se esperaba un AppError y llegó %v", err)
	}
	return appErr.Code
}

func TestValidateCreateSale(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(r *dtos.CreateSaleRequest)
		code   string
	}{
		{"pedido válido en efectivo sin cliente", func(r *dtos.CreateSaleRequest) {}, ""},
		{"sin bodega", func(r *dtos.CreateSaleRequest) { r.WarehouseID = 0 }, "WAREHOUSE_REQUIRED"},
		{"sin productos", func(r *dtos.CreateSaleRequest) { r.Items = nil }, "NO_ITEMS"},
		{"método de pago inválido", func(r *dtos.CreateSaleRequest) { r.PaymentMethod = "cheque" }, "INVALID_PAYMENT_METHOD"},
		{"transferencia sin cliente", func(r *dtos.CreateSaleRequest) { r.PaymentMethod = types.PaymentTransfer }, "CUSTOMER_REQUIRED"},
		{"transferencia con cliente", func(r *dtos.CreateSaleRequest) {
			r.PaymentMethod = types.PaymentTransfer
			r.CustomerID = i64(3)
		}, ""},
		{"crédito sin cliente", func(r *dtos.CreateSaleRequest) { r.PaymentMethod = types.PaymentCredit }, "CUSTOMER_REQUIRED"},
		{"renglón sin ubicación de stock", func(r *dtos.CreateSaleRequest) { r.Items[0].StockID = 0 }, "ITEM_WITHOUT_STOCK"},
		{"cantidad cero", func(r *dtos.CreateSaleRequest) { r.Items[0].Quantity = 0 }, "INVALID_QUANTITY"},
		{"precio negativo", func(r *dtos.CreateSaleRequest) { r.Items[0].UnitPrice = f64(-1) }, "INVALID_PRICE"},
		{"descuento mayor a 100", func(r *dtos.CreateSaleRequest) { r.Items[0].Discount = f64(101) }, "INVALID_DISCOUNT"},
		{"IVA mayor a 100", func(r *dtos.CreateSaleRequest) { r.Items[0].IVAPercent = f64(120) }, "INVALID_IVA"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := validRequest()
			c.mutate(&req)
			err := validateCreateSale(req)
			if c.code == "" {
				if err != nil {
					t.Fatalf("no debía fallar: %v", err)
				}
				return
			}
			if got := errorCode(t, err); got != c.code {
				t.Fatalf("código %s, se esperaba %s", got, c.code)
			}
		})
	}
}

func TestEnsureStageFor(t *testing.T) {
	sale := func(stage types.ProcessStage) *repositories.SaleEntity {
		return &repositories.SaleEntity{SerialCode: "PED-1", CurrentStage: stage}
	}
	cases := []struct {
		action string
		stage  types.ProcessStage
		ok     bool
	}{
		{"pick", types.StageVerificationOK, true},
		{"pick", types.StageVerification, false}, // el pago aún no se confirmó
		{"pick", types.StagePacking, false},      // no se retrocede
		{"pack", types.StagePicking, true},
		{"pack", types.StageVerificationOK, false}, // no se salta el alistamiento
		{"invoice", types.StagePackingOK, true},
		{"invoice", types.StageInvoicing, false}, // no se factura dos veces
		{"dispatch", types.StageInvoicing, true},
		{"dispatch", types.StageDispatch, false}, // despachar dos veces descontaría el stock dos veces
		{"dispatch", types.StagePacking, false},  // sin factura no se despacha
		{"send", types.StageDispatch, true},
		{"send", types.StageSent, false},
		{"send", types.StageInvoicing, false},
	}
	for _, c := range cases {
		err := ensureStageFor(sale(c.stage), c.action)
		if c.ok && err != nil {
			t.Errorf("%s desde %s debía permitirse: %v", c.action, c.stage, err)
		}
		if !c.ok {
			if err == nil {
				t.Errorf("%s desde %s debía rechazarse", c.action, c.stage)
			} else if code := errorCode(t, err); code != "INVALID_STAGE_TRANSITION" {
				t.Errorf("%s desde %s: código %s", c.action, c.stage, code)
			}
		}
	}
}

func TestEnsureOpen(t *testing.T) {
	if err := ensureOpen(&repositories.SaleEntity{Status: types.SaleOpen}, "facturar"); err != nil {
		t.Fatalf("un pedido abierto debe pasar: %v", err)
	}
	if code := errorCode(t, ensureOpen(&repositories.SaleEntity{Status: types.SaleCancelled}, "facturar")); code != "SALE_CANCELLED" {
		t.Fatalf("código %s", code)
	}
	if code := errorCode(t, ensureOpen(&repositories.SaleEntity{Status: types.SaleCompleted}, "facturar")); code != "SALE_COMPLETED" {
		t.Fatalf("código %s", code)
	}
}
