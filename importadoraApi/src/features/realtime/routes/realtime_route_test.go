package routes

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"importadoraApi/src/core/config"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/realtime/controllers"

	"github.com/labstack/echo/v4"
)

func TestRealtimeTicketRouteIsMounted(t *testing.T) {
	e := echo.New()
	e.HTTPErrorHandler = utils.EchoErrorHandler
	auth := middlewares.NewAuthMiddleware(&config.Config{JWTSecret: "test-secret"}, nil, nil)
	ctrl := &controllers.RealtimeController{}

	RegisterRoutes(e, auth, ctrl)

	req := httptest.NewRequest(http.MethodPost, "/realtime/ticket", strings.NewReader("{}"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	res := httptest.NewRecorder()

	e.ServeHTTP(res, req)

	if res.Code == http.StatusNotFound {
		t.Fatal("POST /realtime/ticket no está montada; la ruta devolvió 404")
	}
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("la ruta existe pero se esperaba 401 sin token, se recibió %d: %s", res.Code, res.Body.String())
	}
}
