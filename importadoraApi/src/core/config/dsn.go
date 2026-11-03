package config

// dsn.go · arma la cadena de conexión (DSN) a la base de datos desde la configuración
// conecta con: core/db (la usa para conectar)

import (
	"fmt"
	"net/url"
)

// DatabaseURL construye el DSN seguro para pgxpool y drivers PostgreSQL.
func (c *Config) DatabaseURL() string {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(c.DBUser, c.DBPassword),
		Host:   fmt.Sprintf("%s:%d", c.DBHost, c.DBPort),
		Path:   c.DBName,
	}
	q := u.Query()
	q.Set("sslmode", c.DBSSLMode)
	u.RawQuery = q.Encode()
	return u.String()
}

