package controllers

// auth_controller.go · controlador HTTP de autenticación y sesiones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de autenticación y sesiones y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/auth/dtos"
	"importadoraApi/src/features/auth/services"

	"github.com/labstack/echo/v4"
)

type AuthController struct {
	authService *services.AuthService
}

// NewAuthController crea el controlador con las piezas que necesita para funcionar.
func NewAuthController(authService *services.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

// Login POST /auth/login
func (c *AuthController) Login(ctx echo.Context) error {
	var req dtos.LoginRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.authService.Login(ctx.Request().Context(), req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Inicio de sesión exitoso", res)
}

// Refresh POST /auth/refresh
func (c *AuthController) Refresh(ctx echo.Context) error {
	var req dtos.RefreshRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.authService.Refresh(ctx.Request().Context(), req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Token renovado exitosamente", res)
}

// Logout POST /auth/logout (Requiere Authenticate middleware)
func (c *AuthController) Logout(ctx echo.Context) error {
	actorCtx := middlewares.GetActor(ctx)

	var req dtos.LogoutRequest
	_ = utils.BindOptionalJSON(ctx, &req)

	var (
		sessionID int64
		actorType types.ActorType
		actorID   int64
		companyID *int64
	)
	if actorCtx != nil {
		sessionID = actorCtx.SessionID
		actorType = actorCtx.ActorType
		actorID = actorCtx.ActorID
		companyID = actorCtx.CompanyID
	}

	err := c.authService.Logout(ctx.Request().Context(), companyID, sessionID, actorType, actorID, req.Token(), req.AllSessions)
	if err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

// GetMe GET /auth/me (Requiere Authenticate middleware)
func (c *AuthController) GetMe(ctx echo.Context) error {
	actorCtx := middlewares.GetActor(ctx)
	if actorCtx == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Sesión no autenticada")
	}

	res, err := c.authService.GetMe(ctx.Request().Context(), actorCtx.ActorType, actorCtx.ActorID)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Perfil recuperado", res)
}

// UpdateMe PUT /auth/me (Requiere Authenticate middleware)
func (c *AuthController) UpdateMe(ctx echo.Context) error {
	actorCtx := middlewares.GetActor(ctx)
	if actorCtx == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Sesión no autenticada")
	}

	var req dtos.UpdateMeRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	res, err := c.authService.UpdateMe(ctx.Request().Context(), actorCtx, req)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Perfil actualizado exitosamente", res)
}

// UpdatePassword PUT /auth/me/password (Requiere Authenticate middleware)
func (c *AuthController) UpdatePassword(ctx echo.Context) error {
	actorCtx := middlewares.GetActor(ctx)
	if actorCtx == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Sesión no autenticada")
	}

	var req dtos.UpdatePasswordRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	if err := c.authService.UpdatePassword(ctx.Request().Context(), actorCtx, req); err != nil {
		return err
	}

	return utils.RespondOK[any](ctx, "Contraseña actualizada exitosamente. Por seguridad, se han cerrado las demás sesiones activas.", nil)
}

