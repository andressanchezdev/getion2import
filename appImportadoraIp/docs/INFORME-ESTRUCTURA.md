# Informe de estructura · Fase 7

Fecha: 2026-10-20 · Proyecto: Gestión Importadora (appImportadoraIp) · Generado en solo lectura con un validador propio.

## 1. Resumen

- **Compilación:** `tsc` 0 errores · `eslint` 0 problemas · `vite build` correcto.
- **Archivos revisados:** 216 (más 9 reservados en global2 y features2, intactos) · 7953 líneas de código y CSS.
- **Dependencias entre capas:** 0 violaciones · 0 ciclos en ejecución.
- **Identificadores en español en el código:** 0.
- **Cabecera de comentario:** todos los archivos de código y CSS la tienen.
- **Estilos:** 0 `!important`, 0 colores fuera de `tokens.css`, 0 clases tomadas del CSS de otro componente, 1 estilo en línea (ancho dinámico de la barra de uso).

## 2. Raíz de src

```
App.css  App.tsx  api  app  assets  features  features2  global  global2  main.tsx  styles
```

- Nuevo respecto a lo original: `main.tsx` (archivo) y `styles/` (carpeta con `tokens.css`). No existe ninguna carpeta `types` en la raíz.

## 3. Por directorio

| Directorio | Archivos | Líneas (código y CSS) |
|---|---|---|
| api | 6 | 338 |
| app | 35 | 1850 |
| features | 119 | 4928 |
| global | 13 | 545 |
| styles | 1 | 200 |
| assets | 39 | 0 |

### Features

| Feature | Capas presentes | Archivos | Líneas | Estado |
|---|---|---|---|---|
| auth | types · constants · helpers · selectors · services · slices · thunks · hooks · components · screens | 27 | 625 | ok |
| navigation | types · constants · helpers · slices | 6 | 205 | ok |
| realtime | types · constants · helpers · selectors · services · slices · thunks · hooks | 12 | 259 | ok |
| shop | types · constants · mocks · helpers · selectors · slices · components · screens | 34 | 2129 | ok |
| wallet | types · constants · mocks · helpers · selectors · slices · hooks · components · screens | 37 | 1686 | ok |
| warehouses | types · constants | 3 | 24 | ok |

Reglas: cada feature tiene `types/` e `index.ts`, solo las carpetas que necesita y ninguna carpeta vacía o desconocida.

## 4. Reglas validadas

| Regla | Resultado |
|---|---|
| api no importa de app, features ni global | cumple |
| global no importa de features/app (salvo tipos) | cumple |
| features no importan de app (salvo tipos) ni archivos internos de otra feature | cumple (0 violaciones) |
| Dentro de una feature las capas solo importan hacia abajo (types → constants → helpers → services/selectors → slices → thunks → hooks → components → screens) | cumple (excepción RTK: slice importa thunks en extraReducers) |
| Sin ciclos de importación en ejecución | cumple (existe uno solo de tipos: store ↔ useRedux, se borra al compilar) |
| Código en inglés, textos y comentarios en español | cumple (0 hallazgos en nombres de archivos, carpetas, identificadores y clases) |
| Cada componente usa solo su propio CSS | cumple (0) |
| Código comentado original conservado | cumple: el único bloque comentado que se había perdido (.drawer-badge) se restauró |
| global2 y features2 sin tocar | cumple |

## 5. Archivos largos y hallazgos por archivo

- `assets/images/login-ilustracion.svg` · supera 150 líneas (2811)
- `features/wallet/components/clientRow/CreditUsageBar.tsx` · 1 estilo(s) en línea
- `global/helpers/storage.ts` · console.* en el código

## 6. Archivos no alcanzables desde main.tsx

28 archivos: 27 íconos SVG de reserva en `assets/icons` y `assets/logos/icon.ico`. No son código; se conservan como biblioteca de íconos.

## 7. Exportaciones que nadie más usa (informativo)

`PaginatorMetadata` · `SCREEN_REGISTRY` · `persistor` · `authSlice` · `AuthStatus` · `INITIAL_UI_STATE` · `navigationSlice` · `uiReducer` · `UIState` · `selectRealtimeStatus` · `realtimeSlice` · `INITIAL_CATALOG_FILTERS` · `shopSlice` · `ProductPrices` · `INITIAL_WALLET_FILTERS` · `walletSlice` · `WalletKpis` · `SearchBarProps` · `StatCardProps` · `StoredSession` · `createStorage` · `ApiStatusKind`

Casi todas son API pública deliberada (slices, tipos y alias de retrocompatibilidad). No se borró nada.

## 8. Pendientes y observaciones

- `styles/` es la única carpeta nueva en la raíz de `src` (guarda `tokens.css`). Si se prefiere, puede moverse dentro de otra carpeta existente.
- El login copia el diseño original y **no es responsive**; el texto blanco sobre el botón amarillo `#FBB41A` tiene contraste bajo (≈1.9:1), igual que el original.
- "Registrarse" y "¿Has olvidado tu contraseña?" no tienen acción todavía.
- La bodega activa y los datos de tienda y cartera siguen siendo de ejemplo (mocks); solo el login es real.
- Realtime usa un contrato provisional y está desactivado hasta definir `VITE_WS_URL`.
- `global/helpers/storage.ts` conserva dos `console.warn` en sus `catch` (código original).
- `.shop-catalog-results-count` no tiene estilos (igual que en el original).
- `--bg-hover` se usa con valor de respaldo y no está definido como token.

## 9. Endpoints del backend (Swagger)

Fuente: `/swagger/doc.json` · 185 rutas · 189 operaciones · sin websockets ni webhooks documentados.

Definidos en `api/config.ts`: 27 de 28 (todos existen en Swagger; el restante es el propio documento). **Consumidos hoy:** `POST /auth/login` (login) y `GET /health` (latencia en el footer).

| Grupo (tag) | Operaciones en Swagger | Definidas en config.ts | Consumidas |
|---|---|---|---|
| Auth | 3 | 2 | 1 |
| Brands | 3 | 2 | 0 |
| Carts | 6 | 3 | 0 |
| Categories | 3 | 1 | 0 |
| Companies | 5 | 0 | 0 |
| Customers | 9 | 0 | 0 |
| Directions | 4 | 0 | 0 |
| Discounts | 6 | 0 | 0 |
| Employees | 12 | 6 | 0 |
| health | 2 | 2 | 1 |
| Inventory | 15 | 4 | 0 |
| Management | 9 | 0 | 0 |
| Models | 3 | 1 | 0 |
| Orders | 1 | 0 | 0 |
| Payments | 11 | 0 | 0 |
| Products | 2 | 1 | 0 |
| Purchase Orders | 8 | 0 | 0 |
| Quotations | 13 | 0 | 0 |
| Reports | 4 | 0 | 0 |
| Sales | 12 | 3 | 0 |
| Search | 1 | 0 | 0 |
| SIIGO | 16 | 0 | 0 |
| Suppliers | 10 | 0 | 0 |
| Sync | 13 | 0 | 0 |
| Users | 11 | 0 | 0 |
| Wallet | 4 | 3 | 0 |
| Warehouses | 3 | 1 | 0 |

`GET /health` no está en la lista de `config.ts` original: se agregó como `ENDPOINTS.HEALTH.CHECK`.
