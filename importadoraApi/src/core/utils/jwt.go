package utils

import (
	"fmt"
	"strconv"
	"time"

	"importadoraApi/src/core/types"

	"github.com/golang-jwt/jwt/v5"
)

// AccessClaims contiene la identidad firmada del actor autenticado y el id de su sesión en refresh_tokens.
type AccessClaims struct {
	ActorType   types.ActorType `json:"actorType"`
	ActorID     int64           `json:"actorId"`
	CompanyID   *int64          `json:"companyId,omitempty"`
	WarehouseID *int64          `json:"warehouseId,omitempty"`
	RoleID      *int64          `json:"roleId,omitempty"`
	SessionID   int64           `json:"sid"`
	Email       string          `json:"email"`
	jwt.RegisteredClaims
}

// SignAccessToken firma un JWT HS256 con duración corta vinculado a la sesión activa (SessionID).
func SignAccessToken(
	secret string,
	ttl time.Duration,
	actorType types.ActorType,
	actorID int64,
	companyID *int64,
	warehouseID *int64,
	roleID *int64,
	sessionID int64,
	email string,
) (string, error) {
	now := time.Now().UTC()
	claims := AccessClaims{
		ActorType:   actorType,
		ActorID:     actorID,
		CompanyID:   companyID,
		WarehouseID: warehouseID,
		RoleID:      roleID,
		SessionID:   sessionID,
		Email:       email,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "importadoraApi-v4",
			Subject:   string(actorType) + ":" + strconv.FormatInt(actorID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("error al firmar JWT: %w", err)
	}
	return signed, nil
}

// ParseAccessToken valida firma, algoritmo HS256 y expiración de un token Bearer.
func ParseAccessToken(secret, tokenStr string) (*AccessClaims, error) {
	claims := &AccessClaims{}
	parsed, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("algoritmo de firma inesperado: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, Unauthorized("INVALID_OR_EXPIRED_TOKEN", "El token de acceso es inválido o ha expirado.")
	}
	return claims, nil
}
