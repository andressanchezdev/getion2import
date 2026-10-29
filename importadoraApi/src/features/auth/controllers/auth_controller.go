package controllers

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
	)
	if actorCtx != nil {
		sessionID = actorCtx.SessionID
		actorType = actorCtx.ActorType
		actorID = actorCtx.ActorID
	}

	err := c.authService.Logout(ctx.Request().Context(), sessionID, actorType, actorID, req.Token(), req.AllSessions)
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

