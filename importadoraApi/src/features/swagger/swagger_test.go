package swagger_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"importadoraApi/src/features/swagger/controllers"
	"importadoraApi/src/features/swagger/routes"

	"github.com/labstack/echo/v4"
)

func TestSwaggerEndpoints(t *testing.T) {
	e := echo.New()
	ctrl := controllers.NewSwaggerController()
	routes.RegisterRoutes(e, ctrl)

	// 1. Probar GET /swagger/doc.json
	reqDoc := httptest.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	recDoc := httptest.NewRecorder()
	e.ServeHTTP(recDoc, reqDoc)

	if recDoc.Code != http.StatusOK {
		t.Fatalf("se esperaba 200 en /swagger/doc.json, obtenido: %d", recDoc.Code)
	}

	var docMap map[string]interface{}
	if err := json.Unmarshal(recDoc.Body.Bytes(), &docMap); err != nil {
		t.Fatalf("error parseando swagger.json devuelto por el endpoint: %v", err)
	}

	paths, ok := docMap["paths"].(map[string]interface{})
	if !ok || len(paths) == 0 {
		t.Fatalf("swagger.json no contiene rutas documentadas")
	}

	// 2. Probar GET /swagger/index.html (UI)
	reqUI := httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	recUI := httptest.NewRecorder()
	e.ServeHTTP(recUI, reqUI)

	if recUI.Code != http.StatusOK {
		t.Fatalf("se esperaba 200 en /swagger/index.html, obtenido: %d", recUI.Code)
	}

	if recUI.Body.Len() == 0 {
		t.Fatalf("el cuerpo del UI de swagger está vacío")
	}
}
