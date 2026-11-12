# importadoraRealtime

Servicio de **tiempo real** del ERP: reparte por websocket los cambios que la API guarda, para que cada pantalla se actualice al instante sin volver a pedir datos por HTTP. Es un módulo Go aparte (`go.mod` propio) y **no importa** `importadoraApi`: comparte con ella solo la base de datos y el contrato (`contract/`).

```
 Front (importadoraInterfaz)            API (importadoraApi :3001)                importadoraRealtime (:3002)
 ───────────────────────────            ─────────────────────────                 ───────────────────────────
  POST /realtime/ticket ───────────────►  emite ticket de un solo uso
  wss://…/ws?ticket=… (un solo uso, 30 s) ─────────────────────────────────────► valida el ticket y el acceso
                                          cada cambio de negocio:                      │
                                          INSERT realtime_events + pg_notify ─(BD)─► LISTEN erp_events → lee lo nuevo
  ◄──────────────────────────────────────────────────────────────── evento filtrado por canal y permisos
```

Plan completo: [`PLAN-WEBSOCKET.md`](PLAN-WEBSOCKET.md). Contrato: [`contract/REALTIME-CONTRATO.md`](contract/REALTIME-CONTRATO.md).

## Estado

| Etapa | Qué hay |
|---|---|
| E0 | Contrato v1 (48 tipos) con schemas, ejemplos y validador |
| E3 | Esqueleto: configuración, logs, base, `GET /health`; `GET /ws` responde 503 |
| E4 en adelante | Conexión, hub, listener, recuperación y purga (ver el plan) |

## Correrlo en local

```bash
cp .env.example .env      # completar DB_* (la base debe tener la migración 20261129_realtime.sql)
go run .                  # escucha en :3002
curl http://localhost:3002/health
```

En desarrollo se puede usar `DB_USER=postgres`; fuera de desarrollo va `importadora_realtime` con su clave (se define al desplegar: `ALTER ROLE importadora_realtime PASSWORD '…'`).

## Verificar

```bash
go build ./... && go vet ./... && go test ./...
go run ./contract/scripts/validate.go      # 48/48 ejemplos válidos
```

## Variables

Todas en `.env.example`; la tabla con rangos está en la sección 14.8 del plan. El servicio no arranca si falta la base, si `REALTIME_ALLOWED_ORIGINS` está vacía o es `*` fuera de desarrollo, o si un valor sale de su rango.

## Despliegue (Railway)

Otro servicio del mismo proyecto de la API, con **Root Directory** `importadoraRealtime`, start `./realtime`, healthcheck `/health`, una réplica y su dominio `wss://`. Detalle en la sección 18.2 del plan.
