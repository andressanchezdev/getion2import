package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 10

// HashPassword genera un hash bcrypt seguro compatible con pgcrypto gen_salt('bf').
func HashPassword(plain string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("error al generar hash de contraseña: %w", err)
	}
	return string(bytes), nil
}

// CheckPassword compara una contraseña en texto plano contra un hash bcrypt ($2a$ / $2b$).
func CheckPassword(hash, plain string) bool {
	if hash == "" || plain == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// GenerateOpaqueToken genera un token aleatorio criptográficamente seguro en base64url.
func GenerateOpaqueToken(numBytes int) (string, error) {
	if numBytes < 32 {
		numBytes = 32
	}
	buf := make([]byte, numBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("error al generar bytes aleatorios: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// SHA256Hex calcula el resumen SHA-256 en hexadecimal para almacenar refresh_tokens.token_hash.
func SHA256Hex(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
