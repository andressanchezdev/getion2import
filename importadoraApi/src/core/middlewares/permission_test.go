package middlewares

// permission_test · pruebas de RequirePermission y RequireActors: el empleado necesita el permiso exacto y el superadministrador solo puede mutar gobernanza
// conecta con: auth_middleware.go (RequirePermission y RequireActors)

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"importadoraApi/src/core/types"

	"github.com/labstack/echo/v4"
)

// run ejecuta el middleware con un actor puesto en el contexto y devuelve si dejó pasar y el error que dio
func run(mw echo.MiddlewareFunc, actor *ActorContext) (passed bool, err error) {
	e := echo.New()
	c := e.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), httptest.NewRecorder())
	if actor != nil {
		c.Set(ActorContextKey, actor)
	}
	handler := mw(func(echo.Context) error {
		passed = true
		return nil
	})
	err = handler(c)
	return passed, err
}

// TestRequirePermission revisa quién pasa según su tipo de actor y sus permisos.
func TestRequirePermission(t *testing.T) {
	mw := RequirePermission("roles", "edit")
	cases := []struct {
		name  string
		actor *ActorContext
		pass  bool
	}{
		{"sin sesión no pasa", nil, false},
		{"empleado sin el permiso no pasa", &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"roles:view": true}}, false},
		{"empleado sin ningún permiso no pasa", &ActorContext{ActorType: types.ActorEmployee}, false},
		{"empleado con el permiso exacto pasa (el rol no importa)", &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"roles:edit": true}}, true},
		{"administrador pasa siempre", &ActorContext{ActorType: types.ActorAdmin}, true},
		{"superadministrador no puede mutar módulos operativos", &ActorContext{ActorType: types.ActorSuperadmin}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			passed, err := run(mw, c.actor)
			if passed != c.pass {
				t.Fatalf("pasó = %v, esperaba %v (error: %v)", passed, c.pass, err)
			}
			if !c.pass && err == nil {
				t.Fatal("al no pasar debía devolver un error")
			}
		})
	}

	t.Run("superadministrador puede consultar módulos operativos", func(t *testing.T) {
		passed, err := run(RequirePermission("sales", "view"), &ActorContext{ActorType: types.ActorSuperadmin})
		if !passed || err != nil {
			t.Fatalf("se esperaba acceso de solo lectura (pasó = %v, error: %v)", passed, err)
		}
	})

	t.Run("superadministrador puede mutar gobernanza", func(t *testing.T) {
		passed, err := run(RequirePermission("audit", "edit"), &ActorContext{ActorType: types.ActorSuperadmin})
		if !passed || err != nil {
			t.Fatalf("se esperaba acceso a gobernanza (pasó = %v, error: %v)", passed, err)
		}
	})
}

// TestRequireActors revisa que solo pasen los tipos de actor permitidos.
func TestRequireActors(t *testing.T) {
	mw := RequireActors(types.ActorSuperadmin, types.ActorAdmin)
	if passed, _ := run(mw, &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"roles:edit": true}}); passed {
		t.Fatal("un empleado no debe pasar aunque tenga permisos")
	}
	if passed, _ := run(mw, &ActorContext{ActorType: types.ActorAdmin}); !passed {
		t.Fatal("un administrador debe pasar")
	}
}

// TestRequireAnyPermission revisa que baste una de las llaves y que el superadministrador siga en solo lectura.
func TestRequireAnyPermission(t *testing.T) {
	mw := RequireAnyPermission("customers:view", "orders:create")
	cases := []struct {
		name  string
		actor *ActorContext
		pass  bool
	}{
		{"sin sesión no pasa", nil, false},
		{"empleado sin ninguna llave no pasa", &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"orders:view": true}}, false},
		{"empleado con la primera llave pasa", &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"customers:view": true}}, true},
		{"empleado con la segunda llave pasa", &ActorContext{ActorType: types.ActorEmployee, Permissions: map[string]bool{"orders:create": true}}, true},
		{"administrador pasa siempre", &ActorContext{ActorType: types.ActorAdmin}, true},
		{"superadministrador pasa porque una llave es de lectura", &ActorContext{ActorType: types.ActorSuperadmin}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			passed, err := run(mw, c.actor)
			if passed != c.pass {
				t.Fatalf("pasó = %v, esperaba %v (error: %v)", passed, c.pass, err)
			}
		})
	}
	if passed, _ := run(RequireAnyPermission("orders:create", "stock:edit"), &ActorContext{ActorType: types.ActorSuperadmin}); passed {
		t.Fatal("el superadministrador no debe pasar si todas las llaves son de mutación operativa")
	}
	defer func() {
		if recover() == nil {
			t.Fatal("una llave sin «:» debe hacer fallar el arranque")
		}
	}()
	RequireAnyPermission("customers")
}
