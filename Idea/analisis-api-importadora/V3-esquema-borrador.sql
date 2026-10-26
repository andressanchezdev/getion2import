-- ============================================================
-- GESTIÓN IMPORTADORA V3 · esquema PostgreSQL (BORRADOR para revisión)
-- Se ejecuta en una sola transacción. Solo desarrollo local.
--
-- Orden del archivo:
--   1) tablas por dominio            4) datos de prueba (semillas)
--   2) índices                       5) reglas de estado y flujo (funciones y disparadores)
--   3) vistas                        6) auditoría
-- ============================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ## DOMINIO: Compañías y seguridad
-- Compañía = una empresa que se registra en la plataforma y gestiona lo suyo: empleados, clientes, productos, stock, bodegas y permisos.
-- La compañía anfitriona (is_host) es la que opera la plataforma (Gestión Importadora); su superadministrador puede gestionar a todas.
CREATE TABLE companies (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         TEXT NOT NULL,
  nit          TEXT NOT NULL UNIQUE,
  legal_name   TEXT,
  email        CITEXT,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  is_host      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_companies_host ON companies (is_host) WHERE is_host;   -- solo puede haber una anfitriona

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid          UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id    BIGINT NOT NULL REFERENCES companies(id),         -- cada usuario pertenece a una sola compañía
  email         CITEXT NOT NULL UNIQUE,                            -- un correo = un usuario
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  user_type     TEXT NOT NULL CHECK (user_type IN ('employee','customer')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE roles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_global   BOOLEAN NOT NULL DEFAULT FALSE,    -- rol con alcance sobre todas las compañías (solo el superadmin, de la anfitriona)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, code)
);

CREATE TABLE permissions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  user_id      BIGINT REFERENCES users(id),
  device_code  TEXT NOT NULL,
  name         TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, device_code)
);

-- Catálogo de acciones auditables: define cuáles exigen motivo y cuáles son sensibles
CREATE TABLE audit_actions (
  code            TEXT PRIMARY KEY,                 -- ej. sale.cancel, payment.void, stock.adjust
  entity          TEXT NOT NULL,                    -- tabla sobre la que actúa
  description     TEXT NOT NULL,
  requires_reason BOOLEAN NOT NULL DEFAULT FALSE,   -- si es TRUE, sin motivo la base rechaza la acción
  is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE    -- solo la ve quien tenga audit.view_sensitive
);

-- Registro de auditoría: solo se agregan filas (nunca se edita ni se borra), particionado por mes
CREATE SEQUENCE audit_events_id_seq;

CREATE TABLE audit_events (
  id            BIGINT NOT NULL DEFAULT nextval('audit_events_id_seq'),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id    BIGINT REFERENCES companies(id),
  user_id       BIGINT REFERENCES users(id),        -- quién ejecutó la acción
  user_name     TEXT,                               -- copia del nombre en ese momento
  role_code     TEXT,                               -- rol con el que actuó
  action_code   TEXT NOT NULL,                      -- qué hizo (ver audit_actions)
  entity        TEXT NOT NULL,                      -- sobre qué modelo
  entity_id     BIGINT,
  entity_label  TEXT,                               -- ej. PD-18423, nombre del producto
  module        TEXT,                               -- dónde: gestión y subgestión de la pantalla
  warehouse_id  BIGINT,                             -- dónde: bodega activa (sin llave foránea: es historia)
  store_id      BIGINT,                             -- dónde: tienda activa
  device_id     BIGINT,                             -- dónde: dispositivo
  ip_address    INET,
  reason        TEXT,                               -- motivo, obligatorio si la acción lo exige
  before_data   JSONB,
  after_data    JSONB,
  changed_fields TEXT[],
  request_id    UUID,
  result        TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success','denied','error')),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE audit_events_default PARTITION OF audit_events DEFAULT;

-- ## DOMINIO: Tiempo real
-- Cada cambio importante deja un evento aquí y avisa con NOTIFY; la API en Go lo reparte por WebSocket a las salas
-- (compañía, bodega o usuario). Quien se desconecta pide los eventos que le faltan con el último id que recibió.
CREATE TABLE rt_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  warehouse_id BIGINT,                              -- sala de una bodega; vacío = toda la compañía
  user_id      BIGINT,                              -- sala personal; vacío = todos
  channel      TEXT NOT NULL CHECK (channel IN ('stock','orders','transfers','payments','credit','returns','notifications')),
  event_type   TEXT NOT NULL,                       -- ej. stock.updated, order.stage_changed
  entity       TEXT NOT NULL,
  entity_id    BIGINT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- solo ids y estados; el detalle se consulta por la API
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entrada de un solo uso para abrir el WebSocket sin poner el token en la dirección
CREATE TABLE rt_tickets (
  ticket     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '60 seconds',
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ## DOMINIO: Personas y terceros
CREATE TABLE warehouses (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  city       TEXT,
  address    TEXT,
  siigo_id   BIGINT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, code)
);

CREATE TABLE employees (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  user_id      BIGINT NOT NULL UNIQUE REFERENCES users(id),
  document     TEXT NOT NULL,
  area         TEXT NOT NULL,
  job_title    TEXT,
  warehouse_id BIGINT REFERENCES warehouses(id),
  hired_at     DATE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, document)
);

CREATE TABLE price_levels (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  position   SMALLINT NOT NULL,
  siigo_id   BIGINT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (company_id, code),
  UNIQUE (company_id, position)
);

CREATE TABLE customers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id      BIGINT NOT NULL REFERENCES companies(id),
  user_id         BIGINT UNIQUE REFERENCES users(id),
  document_type   TEXT NOT NULL DEFAULT 'CC',
  document        TEXT NOT NULL,
  name            TEXT NOT NULL,
  email           CITEXT,
  phone           TEXT,
  city            TEXT,
  price_level_id  BIGINT NOT NULL REFERENCES price_levels(id),
  credit_enabled  BOOLEAN NOT NULL DEFAULT FALSE,            -- si puede comprar a crédito
  credit_limit    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','overdue')),
  siigo_id        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (company_id, document)
);

CREATE TABLE customer_addresses (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT,
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE customer_contacts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       CITEXT
);

-- Proveedores, transportadoras y otros terceros: datos externos, SIN usuario ni contraseña.
-- Cada compañía maneja su propia relación con ellos.
CREATE TABLE suppliers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  nit        TEXT NOT NULL,
  name       TEXT NOT NULL,
  contact    TEXT,
  phone      TEXT,
  email      CITEXT,
  city       TEXT,
  terms_days SMALLINT NOT NULL DEFAULT 0,
  siigo_id   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, nit)
);

CREATE TABLE carriers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  name       TEXT NOT NULL,
  phone      TEXT,
  coverage   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, name)
);

CREATE TABLE other_parties (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  category   TEXT NOT NULL,
  nit        TEXT,
  name       TEXT NOT NULL,
  contact    TEXT,
  phone      TEXT,
  email      CITEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, category, name)
);

-- ## DOMINIO: Catálogo
-- Las marcas (Yamaha, Suzuki, Kawasaki, Kixx…) son comunes a todas las compañías. Cada compañía se conecta con las marcas que
-- puede vender (company_brands) y es la dueña de sus productos.
CREATE TABLE brands (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  image_url  TEXT,                       -- logo de la marca (brandImage)
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE company_brands (
  company_id BIGINT NOT NULL REFERENCES companies(id),
  brand_id   BIGINT NOT NULL REFERENCES brands(id),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, brand_id)
);

-- Qué marcas surte cada proveedor (el proveedor Yamaha surte la marca Yamaha)
CREATE TABLE supplier_brands (
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  brand_id    BIGINT NOT NULL REFERENCES brands(id),
  PRIMARY KEY (supplier_id, brand_id)
);

-- Modelo del producto (ej. 15W40, 20W50): es lo que la API llama modelName
CREATE TABLE models (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, name)
);

CREATE TABLE categories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  parent_id  BIGINT REFERENCES categories(id),
  name       TEXT NOT NULL,
  siigo_group_id BIGINT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, parent_id, name)
);

CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id  BIGINT NOT NULL REFERENCES companies(id),          -- la compañía dueña del producto
  brand_id    BIGINT REFERENCES brands(id),
  category_id BIGINT REFERENCES categories(id),
  model_id    BIGINT REFERENCES models(id),
  code        TEXT NOT NULL CHECK (length(trim(code)) > 0),      -- código de barras principal
  name        TEXT NOT NULL,
  description TEXT,
  is_promotion BOOLEAN NOT NULL DEFAULT FALSE,
  unit        TEXT NOT NULL DEFAULT 'UND',
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 19 CHECK (tax_percent >= 0),
  siigo_id    TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive','discontinued')),
  search_text TEXT,                                              -- texto para buscar (lo arma la base)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (company_id, code)
);

CREATE TABLE product_codes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code_type  TEXT NOT NULL CHECK (code_type IN ('sku','reference','barcode','supplier','oem')),
  code       TEXT NOT NULL CHECK (length(trim(code)) > 0),
  UNIQUE (company_id, code_type, code)
);

-- Código QR del producto (existe en la base de producción)
CREATE TABLE product_qr (
  product_id   BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  qr_uuid      UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  qr_payload   TEXT NOT NULL,
  image_url    TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_images (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_main    BOOLEAN NOT NULL DEFAULT FALSE,
  position   SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (product_id, position)
);

CREATE TABLE product_prices (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_level_id BIGINT NOT NULL REFERENCES price_levels(id),
  amount         NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, price_level_id)
);

CREATE TABLE price_history (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_level_id BIGINT NOT NULL REFERENCES price_levels(id),
  old_amount     NUMERIC(14,2),
  new_amount     NUMERIC(14,2) NOT NULL,
  changed_by     BIGINT REFERENCES users(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_suppliers (
  product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id   BIGINT NOT NULL REFERENCES suppliers(id),
  cost          NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
  supplier_code TEXT,
  PRIMARY KEY (product_id, supplier_id)
);

-- Descuentos y favoritos del cliente (dependen del catálogo)
CREATE TABLE customer_discounts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL CHECK (scope IN ('all','brand','category','product')),
  brand_id    BIGINT REFERENCES brands(id),
  category_id BIGINT REFERENCES categories(id),
  product_id  BIGINT REFERENCES products(id),
  percent     NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customer_favorites (
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

-- ## DOMINIO: Inventario
CREATE TABLE warehouse_locations (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  code         TEXT NOT NULL,
  aisle        TEXT,
  shelf        TEXT,
  level        TEXT,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE product_locations (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  location_id  BIGINT REFERENCES warehouse_locations(id),
  UNIQUE (product_id, warehouse_id, location_id)
);

-- Stock físico de una ubicación y en qué está comprometido:
--   disponible para vender = available - in_cart - reserved
CREATE TABLE stock_levels (
  product_location_id BIGINT PRIMARY KEY REFERENCES product_locations(id) ON DELETE CASCADE,
  available    INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),   -- unidades físicas
  in_cart      INTEGER NOT NULL DEFAULT 0 CHECK (in_cart >= 0),     -- apartadas en carritos abiertos
  reserved     INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),    -- reservadas por pedidos
  min_stock    INTEGER NOT NULL DEFAULT 0,
  max_stock    INTEGER,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (in_cart + reserved <= available)
);

-- Tiendas (físicas u online) y stock virtual: cuánto de cada ubicación se ofrece en cada tienda
CREATE TABLE stores (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  store_type TEXT NOT NULL CHECK (store_type IN ('physical','online')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (company_id, code)
);

CREATE TABLE store_warehouses (
  store_id     BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  priority     SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (store_id, warehouse_id)
);

CREATE TABLE virtual_stock (
  store_id            BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id) ON DELETE CASCADE,
  allocated           INTEGER NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  reserved            INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  PRIMARY KEY (store_id, product_location_id)
);

-- Stock prestado entre compañías: la dueña del stock autoriza a otra compañía a vender unidades suyas.
-- La compañía que vende lo hace con SU producto y el stock queda en la ubicación de la dueña.
CREATE TABLE stock_shares (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_company_id    BIGINT NOT NULL REFERENCES companies(id),
  borrower_company_id BIGINT NOT NULL REFERENCES companies(id),
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id),   -- stock de la dueña
  borrower_product_id BIGINT NOT NULL REFERENCES products(id),            -- el mismo producto, en el catálogo de quien lo vende
  qty_authorized      INTEGER NOT NULL CHECK (qty_authorized > 0),
  qty_used            INTEGER NOT NULL DEFAULT 0 CHECK (qty_used >= 0),   -- en carritos, reservado o ya vendido
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_by          BIGINT REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ,
  UNIQUE (product_location_id, borrower_product_id),
  CHECK (owner_company_id <> borrower_company_id),
  CHECK (qty_used <= qty_authorized)
);

CREATE TABLE stock_movements (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id),
  movement_type       TEXT NOT NULL CHECK (movement_type IN ('purchase_in','sale_out','transfer_out','transfer_in','adjustment','return_in','count_adjust')),
  quantity            INTEGER NOT NULL CHECK (quantity <> 0),
  document_type       TEXT,
  document_id         BIGINT,
  created_by          BIGINT REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE counts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','corroborated')),
  created_by   BIGINT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ
);

CREATE TABLE count_items (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  count_id            BIGINT NOT NULL REFERENCES counts(id) ON DELETE CASCADE,
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id),
  expected_qty        INTEGER NOT NULL,
  counted_qty         INTEGER,
  counted_by          BIGINT REFERENCES users(id),
  UNIQUE (count_id, product_location_id)
);

-- ## DOMINIO: Ventas
CREATE TABLE sales_channels (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  UNIQUE (company_id, code)
);

-- Métodos de pago: efectivo, transferencia, crédito y saldo a favor
CREATE TABLE payment_methods (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  siigo_id   BIGINT,
  UNIQUE (company_id, code)
);

-- Pedido. Se convierte en VENTA cuando se verifica el pago (sale_at). Las etapas están en sale_stages.
CREATE TABLE sales (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid              UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  serial_code       TEXT NOT NULL,
  sale_type         TEXT NOT NULL DEFAULT 'sale' CHECK (sale_type IN ('sale','traslade')),
  customer_id       BIGINT REFERENCES customers(id),
  seller_id         BIGINT REFERENCES employees(id),
  warehouse_id      BIGINT NOT NULL REFERENCES warehouses(id),
  store_id          BIGINT REFERENCES stores(id),
  aux_warehouse_id  BIGINT REFERENCES warehouses(id),
  channel_id        BIGINT REFERENCES sales_channels(id),
  price_level_id    BIGINT REFERENCES price_levels(id),
  payment_method_id BIGINT REFERENCES payment_methods(id),   -- el pedido nace con un método: efectivo, transferencia o crédito
  immediate_picking BOOLEAN NOT NULL DEFAULT FALSE,           -- picking inmediato: los ítems se sacan en el momento
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  current_stage     TEXT,                                     -- etapa en la que está (la mantiene la base)
  stage_state       TEXT,                                     -- y su estado
  subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total             NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total        NUMERIC(14,2) NOT NULL DEFAULT 0,         -- suma de pagos verificados
  payment_condition TEXT CHECK (payment_condition IN ('cash','credit')),   -- cash = efectivo o transferencia verificados; credit = nos deben
  sale_at           TIMESTAMPTZ,                              -- desde aquí el pedido es una venta
  cancel_reason     TEXT,
  cancelled_by      BIGINT REFERENCES users(id),
  notes             TEXT,
  created_by        BIGINT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, serial_code),
  CHECK (sale_type <> 'traslade' OR aux_warehouse_id IS NOT NULL),
  CHECK (sale_type = 'traslade' OR payment_method_id IS NOT NULL),
  CHECK (status <> 'cancelled' OR length(trim(coalesce(cancel_reason, ''))) > 0),  -- cancelar exige motivo
  CHECK (sale_at IS NULL OR payment_condition IS NOT NULL)                           -- una venta es de contado o a crédito
);

CREATE TABLE sale_items (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id             BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id          BIGINT NOT NULL REFERENCES products(id),
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id),
  stock_company_id    BIGINT REFERENCES companies(id),       -- de qué compañía salió el stock (la base lo llena)
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  picked_qty          INTEGER NOT NULL DEFAULT 0,            -- unidades ya sacadas de la estantería
  packed_qty          INTEGER NOT NULL DEFAULT 0,            -- unidades ya empacadas
  unit_price          NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),  -- precio congelado
  discount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_percent         NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total          NUMERIC(14,2) NOT NULL DEFAULT 0,      -- la base lo calcula
  CHECK (picked_qty BETWEEN 0 AND quantity),
  CHECK (packed_qty BETWEEN 0 AND picked_qty)               -- no se empaca lo que no se sacó
);

-- Etapas del pedido, en este orden: Verificación, Facturación, Picking, Packing, Envío, Entrega.
-- Cada etapa pasa por: disponible > ocupada (la toma UN empleado) > completada > verificada.
CREATE TABLE sale_stages (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id      BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL CHECK (stage IN ('verification','invoicing','picking','packing','shipping','delivery')),
  position     SMALLINT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','paused','completed','verified')),
  assigned_to  BIGINT REFERENCES employees(id),              -- el empleado que la tiene tomada
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_by  BIGINT REFERENCES employees(id),
  verified_at  TIMESTAMPTZ,
  note         TEXT,
  UNIQUE (sale_id, stage),
  CHECK (status NOT IN ('occupied','paused') OR assigned_to IS NOT NULL),   -- ocupada = tiene dueño
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE TABLE sale_dispatches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id     BIGINT NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  carrier_id  BIGINT REFERENCES carriers(id),
  tracking_no TEXT,
  dispatched_at TIMESTAMPTZ,
  received_at   TIMESTAMPTZ
);

-- Carrito: aparta stock mientras está abierto y vence solo (expires_at). A futuro es una cotización en borrador.
CREATE TABLE carts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  user_id      BIGINT REFERENCES users(id),
  customer_id  BIGINT REFERENCES customers(id),
  warehouse_id BIGINT REFERENCES warehouses(id),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','converted','abandoned')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cart_id             BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id          BIGINT NOT NULL REFERENCES products(id),
  product_location_id BIGINT NOT NULL REFERENCES product_locations(id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_location_id)
);

CREATE TABLE quotations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  serial_code TEXT NOT NULL,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  seller_id   BIGINT REFERENCES employees(id),
  cart_id     BIGINT REFERENCES carts(id),                -- el carrito del que nació la cotización
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','expired','converted')),
  valid_until DATE,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_id     BIGINT REFERENCES sales(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, serial_code)
);

CREATE TABLE quotation_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quotation_id BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id   BIGINT NOT NULL REFERENCES products(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(14,2) NOT NULL
);

-- Devoluciones: NO se devuelve dinero; el valor queda como crédito a favor del cliente
CREATE TABLE returns (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  sale_id     BIGINT NOT NULL REFERENCES sales(id),
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  reason      TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  resolution  TEXT NOT NULL DEFAULT 'credit_in_favor' CHECK (resolution = 'credit_in_favor'),
  total       NUMERIC(14,2) NOT NULL CHECK (total > 0),
  approved_by BIGINT REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_by  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE return_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  return_id    BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  restock      BOOLEAN NOT NULL DEFAULT TRUE                -- vuelve al inventario si sirve para vender
);

-- ## DOMINIO: Dinero y compras
-- Pagos y abonos. Estados como en IP: en revisión > verificado | novedad encontrada | anulado
CREATE TABLE payments (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  sale_id           BIGINT NOT NULL REFERENCES sales(id),
  customer_id       BIGINT REFERENCES customers(id),
  payment_method_id BIGINT NOT NULL REFERENCES payment_methods(id),
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status            TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review','verified','issue','voided')),
  proof_url         TEXT,                                    -- comprobante de la transferencia
  reference         TEXT,
  issue_note        TEXT,                                    -- qué novedad se encontró
  void_reason       TEXT,
  verified_by       BIGINT REFERENCES employees(id),
  verified_at       TIMESTAMPTZ,
  created_by        BIGINT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'voided'   OR length(trim(coalesce(void_reason, ''))) > 0),   -- anular exige motivo
  CHECK (status <> 'issue'    OR length(trim(coalesce(issue_note, ''))) > 0),    -- la novedad se describe
  CHECK (status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

-- Libro de créditos del cliente: lo que DEBE (pendiente) y lo que tiene A FAVOR. Solo se agregan filas.
CREATE TABLE credit_entries (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  bucket      TEXT NOT NULL CHECK (bucket IN ('pending','in_favor')),
  entry_type  TEXT NOT NULL CHECK (entry_type IN ('charge','payment','issue','apply','adjust')),
  amount      NUMERIC(14,2) NOT NULL CHECK (amount <> 0),   -- suma al saldo si es positivo, resta si es negativo
  sale_id     BIGINT REFERENCES sales(id),
  payment_id  BIGINT REFERENCES payments(id),
  return_id   BIGINT REFERENCES returns(id),
  reason      TEXT,
  created_by  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((bucket = 'pending'  AND entry_type IN ('charge','payment','adjust'))
      OR (bucket = 'in_favor' AND entry_type IN ('issue','apply','adjust')))
);

CREATE TABLE purchases (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  serial_code TEXT NOT NULL,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ordered','received','voided')),
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ,
  created_by  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, serial_code)
);

CREATE TABLE purchase_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost   NUMERIC(14,2) NOT NULL
);

CREATE TABLE invoices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  sale_id       BIGINT NOT NULL UNIQUE REFERENCES sales(id),
  number        TEXT,
  siigo_id      TEXT,
  dian_status   TEXT NOT NULL DEFAULT 'pending' CHECK (dian_status IN ('pending','accepted','rejected','annulled')),
  cufe          TEXT,
  dian_errors   JSONB,
  pdf_url       TEXT,
  xml_url       TEXT,
  issued_at     TIMESTAMPTZ
);

-- ## DOMINIO: Integración y operación
CREATE TABLE siigo_credentials (
  company_id     BIGINT PRIMARY KEY REFERENCES companies(id),
  username       TEXT NOT NULL,
  access_key_enc BYTEA NOT NULL,
  partner_id     TEXT NOT NULL,
  environment    TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test','production')),
  token_expires_at TIMESTAMPTZ
);

CREATE TABLE siigo_entity_map (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  entity     TEXT NOT NULL,
  local_id   BIGINT NOT NULL,
  siigo_id   TEXT NOT NULL,
  UNIQUE (company_id, entity, local_id)
);

CREATE TABLE siigo_outbox (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id),
  entity          TEXT NOT NULL,
  entity_id       BIGINT NOT NULL,
  operation       TEXT NOT NULL,
  idempotency_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        SMALLINT NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_queue (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  device_id  BIGINT REFERENCES devices(id),
  entity     TEXT NOT NULL,
  payload    JSONB NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','conflict')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_conflicts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  queue_id      BIGINT NOT NULL REFERENCES sync_queue(id) ON DELETE CASCADE,
  server_data   JSONB,
  device_data   JSONB,
  resolved_by   BIGINT REFERENCES users(id),
  resolved_at   TIMESTAMPTZ
);

CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_rate_limit_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key        TEXT NOT NULL,
  hits       INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_products_code_trgm   ON products USING gin (code gin_trgm_ops);
CREATE INDEX idx_products_search      ON products USING gin (search_text gin_trgm_ops);
CREATE INDEX idx_products_company     ON products (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_codes_trgm   ON product_codes USING gin (code gin_trgm_ops);
CREATE INDEX idx_users_name_trgm      ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_customers_name_trgm  ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_sales_company_status ON sales (company_id, status, current_stage, created_at DESC);
CREATE INDEX idx_sales_customer       ON sales (customer_id, created_at DESC);
CREATE INDEX idx_sale_items_sale      ON sale_items (sale_id);
CREATE INDEX idx_sale_stages_queue    ON sale_stages (stage, status) WHERE status IN ('available','occupied','paused');
CREATE INDEX idx_sale_stages_sale     ON sale_stages (sale_id, position);
CREATE INDEX idx_cart_items_cart      ON cart_items (cart_id);
CREATE INDEX idx_carts_expire         ON carts (expires_at) WHERE status = 'open';
CREATE INDEX idx_stock_mov_loc        ON stock_movements (product_location_id, created_at DESC);
CREATE INDEX idx_stock_shares_borrower ON stock_shares (borrower_company_id, product_location_id) WHERE status = 'active';
CREATE INDEX idx_payments_sale        ON payments (sale_id);
CREATE INDEX idx_payments_review      ON payments (company_id, created_at) WHERE status IN ('review','issue');
CREATE INDEX idx_credit_customer      ON credit_entries (customer_id, bucket);
CREATE UNIQUE INDEX uq_credit_return_issue ON credit_entries (return_id) WHERE entry_type = 'issue';
CREATE INDEX idx_rt_events_cursor     ON rt_events (company_id, id);
CREATE INDEX idx_rt_events_created    ON rt_events (created_at);
CREATE INDEX idx_audit_entity         ON audit_events (company_id, entity, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_user           ON audit_events (company_id, user_id, occurred_at DESC);
CREATE INDEX idx_audit_action         ON audit_events (company_id, action_code, occurred_at DESC);
CREATE INDEX idx_outbox_pending       ON siigo_outbox (next_attempt_at) WHERE status = 'pending';

-- ============================================================
-- SEMILLA (resumen: la versión final trae más productos y stock)
-- ============================================================
-- La compañía anfitriona: Gestión Importadora
INSERT INTO companies (name, nit, is_host) VALUES ('Gestión Importadora', '900000001-1', TRUE);

INSERT INTO price_levels (company_id, code, name, position, is_default) VALUES
  (1,'P0','Mostrador',0,TRUE), (1,'P1','Taller',1,FALSE),
  (1,'P2','Distribuidor',2,FALSE),(1,'P3','Mayorista',3,FALSE);

-- Roles: el superadmin es global (todas las compañías); el admin queda SIN permisos hasta que el superadmin se los dé
INSERT INTO roles (company_id, code, name, is_global) VALUES
  (1,'superadmin','Superadministrador',TRUE);
INSERT INTO roles (company_id, code, name) VALUES
  (1,'admin','Administrador'),(1,'gerente','Gerente'),(1,'vendedor','Vendedor'),
  (1,'bodeguero','Bodeguero'),(1,'facturador','Facturador'),(1,'despachador','Despachador'),
  (1,'cartera','Cartera'),(1,'compras','Compras'),(1,'cliente','Cliente');

-- Catálogo de permisos (módulo.acción)
INSERT INTO permissions (module, action, description) VALUES
  ('catalog','view','Ver el catálogo de productos'),
  ('orders','view','Ver pedidos'),
  ('orders','history','Ver el historial de pedidos'),
  ('orders','create','Crear pedidos'),
  ('orders','edit','Editar pedidos'),
  ('orders','cancel','Cancelar pedidos'),
  ('orders','take_verification','Tomar y verificar la etapa de verificación'),
  ('orders','take_invoicing','Tomar y verificar la etapa de facturación (verifica el pago)'),
  ('orders','take_picking','Tomar y verificar el picking'),
  ('orders','take_packing','Tomar y verificar el packing'),
  ('orders','take_shipping','Tomar y verificar el envío'),
  ('orders','take_delivery','Tomar y verificar la entrega'),
  ('quotations','manage','Gestionar cotizaciones'),
  ('cash','operate','Operar la caja'),
  ('cash','billing','Facturar en caja'),
  ('cash','close','Hacer el cierre de caja'),
  ('wallet','credits','Ver y gestionar créditos'),
  ('wallet','payments','Registrar abonos'),
  ('wallet','verify','Verificar abonos'),
  ('wallet','history','Ver el historial de recaudos'),
  ('products','manage','Gestionar productos'),
  ('catalogs','manage','Gestionar marcas, categorías y modelos'),
  ('purchase_orders','manage','Gestionar órdenes de compra'),
  ('receipts','manage','Gestionar entradas de compra'),
  ('stock','view','Ver existencias y ubicaciones'),
  ('transfers','manage','Gestionar traslados'),
  ('returns','manage','Gestionar y aprobar devoluciones'),
  ('counts','manage','Gestionar conteos de inventario'),
  ('stores','manage','Gestionar tiendas y stock virtual'),
  ('customers','manage','Gestionar clientes'),
  ('employees','manage','Gestionar empleados'),
  ('roles','manage','Gestionar roles y permisos'),
  ('suppliers','manage','Gestionar proveedores'),
  ('carriers','manage','Gestionar transportadoras'),
  ('other_parties','manage','Gestionar otros terceros'),
  ('reports','sales','Ver reportes de ventas'),
  ('reports','general','Ver el reporte general'),
  ('reports','inventory','Ver la valoración del inventario'),
  ('siigo','manage','Gestionar la integración con SIIGO'),
  ('audit','view','Ver movimientos y acciones'),
  ('audit','view_changes','Ver los cambios antes y después por modelo'),
  ('audit','view_sensitive','Ver acciones sensibles'),
  ('audit','export','Exportar la auditoría'),
  ('companies','manage','Registrar y gestionar compañías');

-- El superadmin tiene TODOS los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'superadmin';

-- Los demás roles solo tienen los de su área (el admin no tiene ninguno todavía)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('gerente','reports','sales'),('gerente','reports','general'),('gerente','reports','inventory'),
  ('gerente','orders','view'),('gerente','orders','history'),('gerente','orders','cancel'),
  ('gerente','wallet','history'),('gerente','stock','view'),('gerente','returns','manage'),
  ('vendedor','catalog','view'),('vendedor','orders','view'),('vendedor','orders','history'),
  ('vendedor','orders','create'),('vendedor','orders','edit'),('vendedor','orders','cancel'),
  ('vendedor','orders','take_verification'),('vendedor','quotations','manage'),('vendedor','stock','view'),
  ('bodeguero','orders','view'),('bodeguero','orders','take_picking'),('bodeguero','orders','take_packing'),
  ('bodeguero','stock','view'),('bodeguero','counts','manage'),('bodeguero','transfers','manage'),('bodeguero','returns','manage'),
  ('facturador','orders','view'),('facturador','orders','take_invoicing'),
  ('facturador','cash','operate'),('facturador','cash','billing'),('facturador','cash','close'),
  ('despachador','orders','view'),('despachador','orders','take_shipping'),('despachador','orders','take_delivery'),
  ('cartera','orders','view'),('cartera','orders','history'),('cartera','wallet','credits'),('cartera','wallet','payments'),
  ('cartera','wallet','verify'),('cartera','wallet','history'),('cartera','returns','manage'),
  ('compras','purchase_orders','manage'),('compras','receipts','manage'),('compras','suppliers','manage'),('compras','stock','view'),
  ('cliente','catalog','view'),('cliente','orders','view'),('cliente','orders','history'),('cliente','orders','create')
) AS m(role_code, module, action)
JOIN roles r ON r.code = m.role_code AND r.company_id = 1
JOIN permissions p ON p.module = m.module AND p.action = m.action;

-- 2 usuarios por rol (hash de desarrollo; las contraseñas irán en SEED_USERS.md)
INSERT INTO users (company_id, email, password_hash, full_name, user_type)
SELECT 1, r.code || n || '@demo.local', crypt('Dev#2026', gen_salt('bf')),
       initcap(r.name) || ' ' || n,
       CASE WHEN r.code = 'cliente' THEN 'customer' ELSE 'employee' END
FROM roles r, generate_series(1,2) AS n WHERE r.company_id = 1;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.company_id = 1 AND split_part(u.email,'@',1) IN (r.code || '1', r.code || '2');

INSERT INTO sales_channels (company_id, code, name) VALUES
  (1,'counter','Mostrador'),(1,'online','Tienda en línea'),(1,'corporate','Corporativo');
INSERT INTO payment_methods (company_id, code, name) VALUES
  (1,'cash','Efectivo'),(1,'transfer','Transferencia'),(1,'credit','Crédito'),(1,'favor','Saldo a favor');
INSERT INTO warehouses (company_id, code, name, city) VALUES
  (1,'BOD1','Bodega principal','Bogotá'),(1,'BOD2','Bodega norte','Bogotá');
INSERT INTO stores (company_id, code, name, store_type) VALUES
  (1,'TIENDA1','Tienda principal','physical'),(1,'ONLINE','Tienda en línea','online');
INSERT INTO store_warehouses (store_id, warehouse_id, priority) VALUES (1,1,1),(2,1,1),(2,2,2);

-- cada empleado tiene su ficha (el área es su rol) y cada usuario «cliente» su ficha de cliente (el primero con crédito habilitado)
INSERT INTO employees (company_id, user_id, document, area, warehouse_id)
SELECT 1, u.id, 'EMP' || (1000 + u.id), regexp_replace(split_part(u.email, '@', 1), '[0-9]+$', ''), 1
FROM users u WHERE u.user_type = 'employee';

INSERT INTO customers (company_id, user_id, document, name, email, price_level_id, credit_enabled, credit_limit)
SELECT 1, u.id, 'CC' || (1000000 + u.id), u.full_name, u.email, 1, u.email LIKE 'cliente1@%', CASE WHEN u.email LIKE 'cliente1@%' THEN 2000000 ELSE 0 END
FROM users u WHERE u.user_type = 'customer';

-- Marcas comunes y proveedores (cada proveedor surte su marca)
INSERT INTO brands (name) VALUES ('Yamaha'),('Suzuki'),('Kawasaki'),('Honda'),('Kixx'),('Shell'),('Castrol'),('Global Oil'),('Mobil');
INSERT INTO company_brands (company_id, brand_id) SELECT 1, id FROM brands;
INSERT INTO suppliers (company_id, nit, name, terms_days) VALUES
  (1,'800100001-1','Yamaha Motor Colombia',30),(1,'800100002-2','Suzuki Colombia',30),(1,'800100003-3','Kawasaki Colombia',30),
  (1,'800100004-4','Lubricantes del Pacífico',15);
INSERT INTO supplier_brands (supplier_id, brand_id)
SELECT s.id, b.id FROM suppliers s JOIN brands b ON
  (s.name LIKE 'Yamaha%' AND b.name = 'Yamaha') OR (s.name LIKE 'Suzuki%' AND b.name = 'Suzuki') OR (s.name LIKE 'Kawasaki%' AND b.name = 'Kawasaki')
  OR (s.name LIKE 'Lubricantes%' AND b.name IN ('Kixx','Shell','Castrol','Global Oil','Mobil','Honda'));
INSERT INTO carriers (company_id, name, coverage) VALUES (1,'Servientrega','Nacional'),(1,'Envía','Nacional');

-- Productos de ejemplo (los de las tarjetas del catálogo)
INSERT INTO categories (company_id, name) VALUES (1,'ACEITE');
INSERT INTO models (company_id, name) VALUES (1,'15W40'),(1,'20W50'),(1,'10W30'),(1,'ULTRA 4T');
INSERT INTO products (company_id, brand_id, category_id, model_id, code, name, description) VALUES
  (1,(SELECT id FROM brands WHERE name='Kixx'),1,(SELECT id FROM models WHERE name='15W40'),'8801470510011','ACEITE 15W40',NULL),
  (1,(SELECT id FROM brands WHERE name='Shell'),1,(SELECT id FROM models WHERE name='20W50'),'5011987033207','ACEITE 20W50',NULL),
  (1,(SELECT id FROM brands WHERE name='Castrol'),1,(SELECT id FROM models WHERE name='20W50'),'79191261187','ACEITE ACTEVO','ACTEVO'),
  (1,(SELECT id FROM brands WHERE name='Global Oil'),1,(SELECT id FROM models WHERE name='20W50'),'7709252528579','ACEITE 20W50',NULL),
  (1,(SELECT id FROM brands WHERE name='Honda'),1,(SELECT id FROM models WHERE name='10W30'),'7701234000011','ACEITE 10W30',NULL),
  (1,(SELECT id FROM brands WHERE name='Kixx'),1,(SELECT id FROM models WHERE name='ULTRA 4T'),'8801470510028','ACEITE ULTRA 4T','ULTRA 4T'),
  (1,(SELECT id FROM brands WHERE name='Kixx'),1,(SELECT id FROM models WHERE name='20W50'),'8801470510035','ACEITE MAX 20W50','MAX'),
  (1,(SELECT id FROM brands WHERE name='Mobil'),1,(SELECT id FROM models WHERE name='20W50'),'7709000112233','ACEITE SUPER 4T','SUPER 4T');

INSERT INTO product_prices (product_id, price_level_id, amount)
SELECT p.id, l.id, ROUND((p.id * 1500 + 20000) * (1 - l.position * 0.06), -2)
FROM products p CROSS JOIN price_levels l;
INSERT INTO product_qr (product_id, qr_payload) SELECT id, 'IMP:' || code FROM products;
INSERT INTO product_suppliers (product_id, supplier_id, cost)
SELECT p.id, (SELECT id FROM suppliers WHERE name LIKE 'Lubricantes%'), 15000 FROM products p;

INSERT INTO warehouse_locations (warehouse_id, code, aisle, shelf, level) VALUES (1,'04-F01','04','F','01'),(1,'02-A03','02','A','03'),(2,'C-11','C','11','1');
INSERT INTO product_locations (product_id, warehouse_id, location_id)
SELECT p.id, 1, CASE WHEN p.id % 2 = 0 THEN 2 ELSE 1 END FROM products p;
INSERT INTO product_locations (product_id, warehouse_id, location_id) SELECT id, 2, 3 FROM products WHERE id IN (1,3);
INSERT INTO stock_levels (product_location_id, available, min_stock)
SELECT pl.id, CASE WHEN pl.product_id IN (2,4) AND pl.warehouse_id = 1 THEN 0 ELSE 12 + pl.product_id * 5 END, 5 FROM product_locations pl;

-- ============================================================
-- REGLAS DE ESTADO Y DE FLUJO (todo se hace respetar desde la base de datos)
-- ============================================================

-- ---------- Utilidades ----------
-- La API, al abrir cada transacción, informa quién actúa y desde dónde:
--   SELECT set_config('app.user_id','12',true), set_config('app.company_id','1',true), set_config('app.module','inventory/products',true), ...
CREATE OR REPLACE FUNCTION audit_ctx(p_key TEXT) RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.' || p_key, true), '')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_companies_upd BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_upd     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_upd BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_upd  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_upd     BEFORE UPDATE ON sales     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Compañías: todo lo relacionado pertenece a la misma compañía ----------
-- Cada argumento es «columna:tabla». Con company_id en la fila se compara con él; si no, todos los referenciados deben coincidir entre sí.
CREATE OR REPLACE FUNCTION company_guard() RETURNS trigger AS $$
DECLARE v_arg TEXT; v_col TEXT; v_tbl TEXT; v_row JSONB := to_jsonb(NEW); v_val BIGINT; v_comp BIGINT; v_own BIGINT := (to_jsonb(NEW) ->> 'company_id')::BIGINT;
BEGIN
  FOREACH v_arg IN ARRAY TG_ARGV LOOP
    v_col := split_part(v_arg, ':', 1); v_tbl := split_part(v_arg, ':', 2);
    v_val := (v_row ->> v_col)::BIGINT;
    CONTINUE WHEN v_val IS NULL;
    EXECUTE format('SELECT company_id FROM %I WHERE id = $1', v_tbl) INTO v_comp USING v_val;
    IF v_own IS NULL THEN v_own := v_comp;
    ELSIF v_comp IS DISTINCT FROM v_own THEN
      RAISE EXCEPTION '% (%) pertenece a otra compañía', v_col, v_val USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_employees  BEFORE INSERT OR UPDATE ON employees  FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users','warehouse_id:warehouses');
CREATE TRIGGER trg_company_customers  BEFORE INSERT OR UPDATE ON customers  FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users','price_level_id:price_levels');
CREATE TRIGGER trg_company_user_roles BEFORE INSERT OR UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users','role_id:roles');
CREATE TRIGGER trg_company_products   BEFORE INSERT OR UPDATE ON products   FOR EACH ROW EXECUTE FUNCTION company_guard('category_id:categories','model_id:models');
CREATE TRIGGER trg_company_prices     BEFORE INSERT OR UPDATE ON product_prices    FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products','price_level_id:price_levels');
CREATE TRIGGER trg_company_prod_sup   BEFORE INSERT OR UPDATE ON product_suppliers FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products','supplier_id:suppliers');
CREATE TRIGGER trg_company_prod_loc   BEFORE INSERT OR UPDATE ON product_locations FOR EACH ROW EXECUTE FUNCTION company_guard('product_id:products','warehouse_id:warehouses');
CREATE TRIGGER trg_company_store_wh   BEFORE INSERT OR UPDATE ON store_warehouses  FOR EACH ROW EXECUTE FUNCTION company_guard('store_id:stores','warehouse_id:warehouses');
CREATE TRIGGER trg_company_sales      BEFORE INSERT OR UPDATE ON sales     FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers','seller_id:employees','warehouse_id:warehouses','store_id:stores','aux_warehouse_id:warehouses','channel_id:sales_channels','price_level_id:price_levels','payment_method_id:payment_methods');
CREATE TRIGGER trg_company_sale_items BEFORE INSERT OR UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales','product_id:products');
CREATE TRIGGER trg_company_carts      BEFORE INSERT OR UPDATE ON carts     FOR EACH ROW EXECUTE FUNCTION company_guard('user_id:users','customer_id:customers','warehouse_id:warehouses');
CREATE TRIGGER trg_company_cart_items BEFORE INSERT OR UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION company_guard('cart_id:carts','product_id:products');
CREATE TRIGGER trg_company_quotations BEFORE INSERT OR UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers','seller_id:employees','cart_id:carts');
CREATE TRIGGER trg_company_payments   BEFORE INSERT OR UPDATE ON payments  FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales','customer_id:customers','payment_method_id:payment_methods');
CREATE TRIGGER trg_company_returns    BEFORE INSERT OR UPDATE ON returns   FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales','customer_id:customers');
CREATE TRIGGER trg_company_credit     BEFORE INSERT OR UPDATE ON credit_entries FOR EACH ROW EXECUTE FUNCTION company_guard('customer_id:customers','sale_id:sales','payment_id:payments','return_id:returns');
CREATE TRIGGER trg_company_purchases  BEFORE INSERT OR UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION company_guard('supplier_id:suppliers','warehouse_id:warehouses');
CREATE TRIGGER trg_company_counts     BEFORE INSERT OR UPDATE ON counts    FOR EACH ROW EXECUTE FUNCTION company_guard('warehouse_id:warehouses');
CREATE TRIGGER trg_company_invoices   BEFORE INSERT OR UPDATE ON invoices  FOR EACH ROW EXECUTE FUNCTION company_guard('sale_id:sales');

-- Un rol global solo puede existir en la compañía anfitriona
CREATE OR REPLACE FUNCTION role_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.is_global AND NOT EXISTS (SELECT 1 FROM companies WHERE id = NEW.company_id AND is_host) THEN
    RAISE EXCEPTION 'Un rol global solo puede pertenecer a la compañía anfitriona';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_role_guard BEFORE INSERT OR UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION role_guard();

-- Al registrar una compañía nueva recibe lo básico para operar: roles (con sus permisos), niveles de precio, métodos de pago y canales
CREATE OR REPLACE FUNCTION company_bootstrap() RETURNS trigger AS $$
DECLARE v_host BIGINT;
BEGIN
  SELECT id INTO v_host FROM companies WHERE is_host;
  IF v_host IS NULL OR v_host = NEW.id THEN RETURN NEW; END IF;
  INSERT INTO roles (company_id, code, name, description) SELECT NEW.id, code, name, description FROM roles WHERE company_id = v_host AND NOT is_global;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT nr.id, rp.permission_id FROM roles hr JOIN role_permissions rp ON rp.role_id = hr.id
      JOIN roles nr ON nr.company_id = NEW.id AND nr.code = hr.code WHERE hr.company_id = v_host AND NOT hr.is_global;
  INSERT INTO price_levels (company_id, code, name, position, is_default) SELECT NEW.id, code, name, position, is_default FROM price_levels WHERE company_id = v_host;
  INSERT INTO payment_methods (company_id, code, name) SELECT NEW.id, code, name FROM payment_methods WHERE company_id = v_host;
  INSERT INTO sales_channels (company_id, code, name) SELECT NEW.id, code, name FROM sales_channels WHERE company_id = v_host;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_company_bootstrap AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION company_bootstrap();

-- ¿Puede este usuario trabajar con esta compañía? (el superadmin sí con todas; los demás solo con la suya)
CREATE OR REPLACE FUNCTION user_can_access_company(p_user BIGINT, p_company BIGINT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
     WHERE u.id = p_user AND u.status = 'active' AND u.deleted_at IS NULL
       AND (u.company_id = p_company
            OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.is_global AND r.is_active)))
$$ LANGUAGE sql STABLE;

-- ¿Tiene este empleado el permiso módulo.acción? (a través de sus roles)
CREATE OR REPLACE FUNCTION employee_can(p_employee BIGINT, p_module TEXT, p_action TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
      JOIN users u ON u.id = e.user_id AND u.status = 'active' AND u.deleted_at IS NULL
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.is_active
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id AND p.module = p_module AND p.action = p_action
     WHERE e.id = p_employee AND e.is_active)
$$ LANGUAGE sql STABLE;

-- ---------- Acceso: un usuario inactivo, bloqueado o borrado no puede iniciar sesión ----------
CREATE OR REPLACE FUNCTION auth_login_allowed(p_user_id BIGINT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN companies c ON c.id = u.company_id AND c.is_active
    WHERE u.id = p_user_id AND u.status = 'active' AND u.deleted_at IS NULL
      AND (u.user_type <> 'employee' OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id AND e.is_active))
      AND (u.user_type <> 'customer' OR EXISTS (SELECT 1 FROM customers k WHERE k.user_id = u.id AND k.status <> 'inactive' AND k.deleted_at IS NULL))
  )
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION refresh_token_guard() RETURNS trigger AS $$
BEGIN
  IF NOT auth_login_allowed(NEW.user_id) THEN
    RAISE EXCEPTION 'Este usuario no puede iniciar sesión (inactivo, bloqueado o sin ficha activa)' USING ERRCODE = '28000';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_refresh_token_guard BEFORE INSERT ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION refresh_token_guard();

-- Al desactivar o bloquear un usuario se cierran todas sus sesiones
CREATE OR REPLACE FUNCTION user_status_cascade() RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL THEN
    UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_user_status_cascade AFTER UPDATE OF status, deleted_at ON users FOR EACH ROW EXECUTE FUNCTION user_status_cascade();

-- Desactivar un cliente o un empleado desactiva también su usuario
CREATE OR REPLACE FUNCTION person_status_to_user() RETURNS trigger AS $$
DECLARE v_off BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'customers' THEN v_off := NEW.status = 'inactive' OR NEW.deleted_at IS NOT NULL;
  ELSE v_off := NOT NEW.is_active; END IF;
  IF v_off AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET status = 'inactive' WHERE id = NEW.user_id AND status = 'active';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_customer_status_to_user AFTER UPDATE OF status, deleted_at ON customers FOR EACH ROW EXECUTE FUNCTION person_status_to_user();
CREATE TRIGGER trg_employee_status_to_user AFTER UPDATE OF is_active ON employees FOR EACH ROW EXECUTE FUNCTION person_status_to_user();

-- Entrada de un solo uso al WebSocket: devuelve quién es y de qué compañía, o nada si venció, ya se usó o el usuario no puede entrar
CREATE OR REPLACE FUNCTION rt_ticket_consume(p_ticket UUID) RETURNS TABLE (user_id BIGINT, company_id BIGINT) AS $$
  UPDATE rt_tickets t SET used_at = now()
   FROM users u
   WHERE t.ticket = p_ticket AND t.used_at IS NULL AND t.expires_at > now() AND u.id = t.user_id AND auth_login_allowed(u.id)
  RETURNING t.user_id, u.company_id
$$ LANGUAGE sql;

-- ---------- Catálogo ----------
-- El producto solo puede tener una marca con la que su compañía esté conectada
CREATE OR REPLACE FUNCTION product_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM company_brands WHERE company_id = NEW.company_id AND brand_id = NEW.brand_id AND is_active) THEN
    RAISE EXCEPTION 'La compañía no está conectada con la marca %', NEW.brand_id USING ERRCODE = '23514';
  END IF;
  NEW.search_text := lower(concat_ws(' ', NEW.code, NEW.name, NEW.description,
    (SELECT name FROM brands WHERE id = NEW.brand_id), (SELECT name FROM categories WHERE id = NEW.category_id), (SELECT name FROM models WHERE id = NEW.model_id)));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_product_guard BEFORE INSERT OR UPDATE OF brand_id, category_id, model_id, code, name, description ON products FOR EACH ROW EXECUTE FUNCTION product_guard();
UPDATE products SET name = name;   -- arma el texto de búsqueda de los productos ya sembrados

-- Solo lo activo se puede usar
CREATE OR REPLACE FUNCTION ensure_product_active(p_product BIGINT) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product AND status = 'active' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El producto % no está activo', p_product USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION ensure_customer_active(p_customer BIGINT) RETURNS VOID AS $$
BEGIN
  IF p_customer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer AND status <> 'inactive' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El cliente % está inactivo', p_customer USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION customer_ref_guard() RETURNS trigger AS $$
BEGIN PERFORM ensure_customer_active(NEW.customer_id); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_carts_customer      BEFORE INSERT ON carts      FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();
CREATE TRIGGER trg_quotations_customer BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION customer_ref_guard();

CREATE OR REPLACE FUNCTION line_product_guard() RETURNS trigger AS $$
BEGIN PERFORM ensure_product_active(NEW.product_id); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quotation_items_active BEFORE INSERT ON quotation_items FOR EACH ROW EXECUTE FUNCTION line_product_guard();

-- ---------- Stock: apartar y reservar (también con stock prestado) ----------
-- Un préstamo solo se crea sobre stock de la dueña, para un producto de la compañía que lo recibe y sin pasar de lo que hay libre
CREATE OR REPLACE FUNCTION stock_share_guard() RETURNS trigger AS $$
DECLARE v_owner BIGINT; v_free INTEGER;
BEGIN
  SELECT p.company_id, sl.available - sl.in_cart - sl.reserved INTO v_owner, v_free
    FROM product_locations pl JOIN products p ON p.id = pl.product_id JOIN stock_levels sl ON sl.product_location_id = pl.id
   WHERE pl.id = NEW.product_location_id;
  IF v_owner IS DISTINCT FROM NEW.owner_company_id THEN RAISE EXCEPTION 'La ubicación no pertenece a la compañía dueña del stock'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.borrower_product_id AND company_id = NEW.borrower_company_id) THEN
    RAISE EXCEPTION 'El producto no pertenece a la compañía que recibe el stock';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.qty_authorized > v_free THEN
    RAISE EXCEPTION 'No hay stock libre suficiente para prestar (libre %)', v_free USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock_share_guard BEFORE INSERT OR UPDATE ON stock_shares FOR EACH ROW EXECUTE FUNCTION stock_share_guard();

-- Aparta (in_cart) o reserva (reserved) unidades de una ubicación; delta negativo las libera. Devuelve la compañía dueña del stock.
-- Si el stock es de otra compañía, exige un préstamo activo y descuenta de su cupo.
CREATE OR REPLACE FUNCTION stock_hold(p_company BIGINT, p_product BIGINT, p_location BIGINT, p_bucket TEXT, p_delta INTEGER) RETURNS BIGINT AS $$
DECLARE v_owner BIGINT; v_loc_product BIGINT;
BEGIN
  SELECT p.company_id, p.id INTO v_owner, v_loc_product FROM product_locations pl JOIN products p ON p.id = pl.product_id WHERE pl.id = p_location;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'La ubicación % no existe', p_location; END IF;
  IF v_owner = p_company THEN
    IF v_loc_product <> p_product THEN RAISE EXCEPTION 'La ubicación % no es del producto %', p_location, p_product; END IF;
  ELSE
    UPDATE stock_shares SET qty_used = qty_used + p_delta
     WHERE owner_company_id = v_owner AND borrower_company_id = p_company AND product_location_id = p_location
       AND borrower_product_id = p_product AND (status = 'active' OR p_delta < 0)
       AND qty_used + p_delta BETWEEN 0 AND qty_authorized;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La compañía % no tiene stock prestado suficiente en la ubicación %', p_company, p_location USING ERRCODE = '23514';
    END IF;
  END IF;
  IF p_bucket = 'in_cart' THEN
    UPDATE stock_levels SET in_cart = in_cart + p_delta, updated_at = now()
     WHERE product_location_id = p_location AND (p_delta < 0 OR available - reserved - in_cart >= p_delta);
  ELSE
    UPDATE stock_levels SET reserved = reserved + p_delta, updated_at = now()
     WHERE product_location_id = p_location AND (p_delta < 0 OR available - reserved - in_cart >= p_delta);
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente en la ubicación %', p_location USING ERRCODE = '23514'; END IF;
  RETURN v_owner;
END; $$ LANGUAGE plpgsql;

-- ---------- Carrito: aparta stock mientras está abierto ----------
CREATE OR REPLACE FUNCTION cart_items_guard() RETURNS trigger AS $$
DECLARE v_cart carts%ROWTYPE; v_cart_id BIGINT; v_delta INTEGER; v_prod BIGINT; v_loc BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_cart_id := OLD.cart_id; v_delta := -OLD.quantity; v_prod := OLD.product_id; v_loc := OLD.product_location_id;
  ELSIF TG_OP = 'INSERT' THEN v_cart_id := NEW.cart_id; v_delta := NEW.quantity; v_prod := NEW.product_id; v_loc := NEW.product_location_id; PERFORM ensure_product_active(NEW.product_id);
  ELSE v_cart_id := NEW.cart_id; v_delta := NEW.quantity - OLD.quantity; v_prod := NEW.product_id; v_loc := NEW.product_location_id; END IF;
  SELECT * INTO v_cart FROM carts WHERE id = v_cart_id;
  IF v_cart.status = 'open' THEN
    IF v_cart.expires_at < now() AND v_delta > 0 THEN RAISE EXCEPTION 'El carrito venció: ábrelo de nuevo'; END IF;
    IF v_delta <> 0 THEN PERFORM stock_hold(v_cart.company_id, v_prod, v_loc, 'in_cart', v_delta); END IF;
  ELSIF v_delta > 0 THEN
    RAISE EXCEPTION 'El carrito ya no está abierto';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cart_items_guard BEFORE INSERT OR DELETE OR UPDATE OF quantity ON cart_items FOR EACH ROW EXECUTE FUNCTION cart_items_guard();

-- Al convertir o abandonar el carrito se libera todo lo que tenía apartado
CREATE OR REPLACE FUNCTION cart_release() RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT product_id, product_location_id, quantity FROM cart_items WHERE cart_id = NEW.id LOOP
    PERFORM stock_hold(NEW.company_id, r.product_id, r.product_location_id, 'in_cart', -r.quantity);
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cart_release AFTER UPDATE OF status ON carts FOR EACH ROW
  WHEN (OLD.status = 'open' AND NEW.status <> 'open') EXECUTE FUNCTION cart_release();

-- La API (o un cron) la llama cada minuto: abandona los carritos vencidos y libera su stock
CREATE OR REPLACE FUNCTION release_expired_carts() RETURNS INTEGER AS $$
DECLARE v_n INTEGER;
BEGIN
  UPDATE carts SET status = 'abandoned' WHERE status = 'open' AND expires_at < now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

-- ---------- Cotización: solo una cotización aceptada se convierte en pedido ----------
CREATE OR REPLACE FUNCTION quotation_flow_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT ((OLD.status = 'draft' AND NEW.status IN ('sent','expired'))
       OR (OLD.status = 'sent' AND NEW.status IN ('accepted','expired'))
       OR (OLD.status = 'accepted' AND NEW.status IN ('converted','expired'))) THEN
    RAISE EXCEPTION 'La cotización no puede pasar de % a %', OLD.status, NEW.status;
  END IF;
  IF NEW.status = 'converted' AND NEW.sale_id IS NULL THEN
    RAISE EXCEPTION 'Para convertir la cotización se necesita el pedido creado';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quotation_flow BEFORE UPDATE OF status ON quotations FOR EACH ROW EXECUTE FUNCTION quotation_flow_guard();

-- ---------- Pedido: encabezado ----------
CREATE OR REPLACE FUNCTION sale_header_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM ensure_customer_active(NEW.customer_id);
    IF NOT EXISTS (SELECT 1 FROM warehouses WHERE id = NEW.warehouse_id AND is_active) THEN
      RAISE EXCEPTION 'La bodega está inactiva';
    END IF;
    IF NEW.seller_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employees WHERE id = NEW.seller_id AND is_active) THEN
      RAISE EXCEPTION 'El vendedor está inactivo';
    END IF;
    IF NEW.immediate_picking AND NEW.sale_type <> 'sale' THEN RAISE EXCEPTION 'El picking inmediato es solo para ventas'; END IF;
    NEW.current_stage := CASE NEW.sale_type WHEN 'sale' THEN 'verification' ELSE 'picking' END;
    NEW.stage_state := 'available';
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status <> 'open' THEN
    RAISE EXCEPTION 'El pedido % ya está %: no se puede reabrir', OLD.serial_code, OLD.status;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status = 'open' THEN
    IF EXISTS (SELECT 1 FROM sale_stages WHERE sale_id = OLD.id AND stage = 'shipping' AND status <> 'available') THEN
      RAISE EXCEPTION 'El pedido % ya está en envío: no se puede cancelar', OLD.serial_code;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_header_guard BEFORE INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION sale_header_guard();

-- Al crear el pedido se crean sus etapas (los traslados no pasan por verificación ni facturación)
CREATE OR REPLACE FUNCTION sale_create_stages() RETURNS trigger AS $$
BEGIN
  INSERT INTO sale_stages (sale_id, stage, position)
  SELECT NEW.id, s.stage, s.pos
  FROM (VALUES ('verification',1),('invoicing',2),('picking',3),('packing',4),('shipping',5),('delivery',6)) AS s(stage, pos)
  WHERE NEW.sale_type = 'sale' OR s.stage IN ('picking','packing','shipping','delivery');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_create_stages AFTER INSERT ON sales FOR EACH ROW EXECUTE FUNCTION sale_create_stages();

-- ---------- Pedido: renglones (reservan stock; solo se editan antes de que sea venta) ----------
CREATE OR REPLACE FUNCTION sale_items_guard() RETURNS trigger AS $$
DECLARE v_sale sales%ROWTYPE; v_sale_id BIGINT; v_delta INTEGER; v_prod BIGINT; v_loc BIGINT; v_edit BOOLEAN; v_owner BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id; v_delta := -OLD.quantity; v_prod := OLD.product_id; v_loc := OLD.product_location_id; v_edit := TRUE;
  ELSIF TG_OP = 'INSERT' THEN
    v_sale_id := NEW.sale_id; v_delta := NEW.quantity; v_prod := NEW.product_id; v_loc := NEW.product_location_id; v_edit := TRUE;
    PERFORM ensure_product_active(NEW.product_id);
  ELSE
    v_sale_id := NEW.sale_id; v_delta := NEW.quantity - OLD.quantity; v_prod := NEW.product_id; v_loc := NEW.product_location_id; v_edit := v_delta <> 0;
  END IF;

  SELECT * INTO v_sale FROM sales WHERE id = v_sale_id;
  IF v_edit THEN
    IF v_sale.status <> 'open' THEN RAISE EXCEPTION 'El pedido no está abierto: no se pueden cambiar sus productos'; END IF;
    IF v_sale.sale_at IS NOT NULL OR EXISTS (SELECT 1 FROM sale_stages WHERE sale_id = v_sale_id AND stage = 'picking' AND status <> 'available') THEN
      RAISE EXCEPTION 'El pedido ya es venta o el picking empezó: no se pueden cambiar sus productos';
    END IF;
  END IF;
  IF v_delta <> 0 THEN v_owner := stock_hold(v_sale.company_id, v_prod, v_loc, 'reserved', v_delta); END IF;
  IF TG_OP = 'INSERT' THEN NEW.stock_company_id := v_owner; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_items_guard BEFORE INSERT OR DELETE OR UPDATE OF quantity ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_items_guard();

-- El total de cada renglón y del pedido los calcula la base
CREATE OR REPLACE FUNCTION sale_item_total() RETURNS trigger AS $$
BEGIN
  NEW.line_total := ROUND(NEW.quantity * NEW.unit_price - NEW.discount, 2)
                  + ROUND((NEW.quantity * NEW.unit_price - NEW.discount) * NEW.tax_percent / 100, 2);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_item_total BEFORE INSERT OR UPDATE OF quantity, unit_price, discount, tax_percent ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_item_total();

CREATE OR REPLACE FUNCTION sale_recalc_totals() RETURNS trigger AS $$
DECLARE v_sale BIGINT := CASE WHEN TG_OP = 'DELETE' THEN OLD.sale_id ELSE NEW.sale_id END;
BEGIN
  UPDATE sales s SET
    subtotal       = COALESCE(x.sub, 0),
    discount_total = COALESCE(x.disc, 0),
    tax_total      = COALESCE(x.tax, 0),
    total          = COALESCE(x.sub, 0) - COALESCE(x.disc, 0) + COALESCE(x.tax, 0)
  FROM (SELECT SUM(quantity * unit_price) AS sub, SUM(discount) AS disc,
               SUM(ROUND((quantity * unit_price - discount) * tax_percent / 100, 2)) AS tax
          FROM sale_items WHERE sale_id = v_sale) x
  WHERE s.id = v_sale;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_recalc AFTER INSERT OR DELETE OR UPDATE OF quantity, unit_price, discount, tax_percent ON sale_items FOR EACH ROW EXECUTE FUNCTION sale_recalc_totals();

-- ---------- Pago: confirma el método y convierte el pedido en venta (al verificar la facturación) ----------
CREATE OR REPLACE FUNCTION sale_confirm_payment(p_sale BIGINT) RETURNS VOID AS $$
DECLARE s sales%ROWTYPE; c customers%ROWTYPE; v_code TEXT; v_paid NUMERIC; v_debt NUMERIC;
BEGIN
  SELECT * INTO s FROM sales WHERE id = p_sale;
  SELECT code INTO v_code FROM payment_methods WHERE id = s.payment_method_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payments WHERE sale_id = p_sale AND status = 'verified';

  IF v_paid >= s.total THEN
    UPDATE sales SET payment_condition = 'cash', sale_at = now(), paid_total = v_paid WHERE id = p_sale;      -- venta pagada
  ELSIF v_code = 'credit' THEN
    IF s.customer_id IS NULL THEN RAISE EXCEPTION 'La venta a crédito necesita un cliente'; END IF;
    SELECT * INTO c FROM customers WHERE id = s.customer_id;
    IF NOT c.credit_enabled OR c.status <> 'active' THEN
      RAISE EXCEPTION 'El cliente % no tiene el crédito habilitado o está en mora', c.name USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_debt FROM credit_entries WHERE customer_id = c.id AND bucket = 'pending';
    IF v_debt + (s.total - v_paid) > c.credit_limit THEN
      RAISE EXCEPTION 'La venta supera el cupo de crédito del cliente (cupo %, deuda %)', c.credit_limit, v_debt USING ERRCODE = '23514';
    END IF;
    INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, created_by)
    VALUES (s.company_id, c.id, 'pending', 'charge', s.total - v_paid, s.id, audit_ctx('user_id')::BIGINT);
    UPDATE sales SET payment_condition = 'credit', sale_at = now(), paid_total = v_paid WHERE id = p_sale;     -- venta a crédito: nos deben
  ELSE
    RAISE EXCEPTION 'El pago verificado (%) no cubre el total del pedido (%)', v_paid, s.total USING ERRCODE = '23514';
  END IF;
END; $$ LANGUAGE plpgsql;

-- ---------- Etapas: orden, ocupación, permisos y verificación ----------
CREATE OR REPLACE FUNCTION sale_stage_guard() RETURNS trigger AS $$
DECLARE v_sale sales%ROWTYPE;
BEGIN
  IF NEW.status = OLD.status AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
  SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id FOR UPDATE;
  IF v_sale.status <> 'open' THEN RAISE EXCEPTION 'El pedido % está %', v_sale.serial_code, v_sale.status; END IF;

  -- ocupación: si otro empleado la tiene tomada, nadie más puede tomarla
  IF OLD.status IN ('occupied','paused') AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    RAISE EXCEPTION 'La etapa % del pedido % ya la tiene tomada otro empleado', NEW.stage, v_sale.serial_code USING ERRCODE = '55P03';
  END IF;
  -- quien la toma debe estar activo y tener el permiso de esa etapa
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    IF NOT employee_can(NEW.assigned_to, 'orders', 'take_' || NEW.stage) THEN
      RAISE EXCEPTION 'El empleado no tiene permiso para la etapa %', NEW.stage USING ERRCODE = '42501';
    END IF;
  END IF;

  -- transiciones permitidas (sin saltos)
  IF NOT ( (OLD.status = 'available' AND NEW.status = 'occupied')
        OR (OLD.status = 'occupied'  AND NEW.status IN ('paused','completed','available'))
        OR (OLD.status = 'paused'    AND NEW.status IN ('occupied','available'))
        OR (OLD.status = 'completed' AND NEW.status IN ('verified','occupied'))
        OR (OLD.status = 'available' AND NEW.status = 'verified' AND NEW.stage = 'picking' AND v_sale.immediate_picking) ) THEN
    RAISE EXCEPTION 'La etapa % no puede pasar de % a %', NEW.stage, OLD.status, NEW.status;
  END IF;

  -- no se empieza una etapa si la anterior no está verificada (excepción: el picking inmediato se verifica directo)
  IF OLD.status = 'available' AND NEW.status IN ('occupied','verified')
     AND EXISTS (SELECT 1 FROM sale_stages WHERE sale_id = NEW.sale_id AND position < NEW.position AND status <> 'verified') THEN
    RAISE EXCEPTION 'No se puede iniciar %: la etapa anterior del pedido % no está verificada', NEW.stage, v_sale.serial_code;
  END IF;

  -- rehacer una etapa ya completada exige motivo
  IF OLD.status = 'completed' AND NEW.status = 'occupied' AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'Devolver una etapa exige un motivo';
  END IF;

  -- liberar la etapa quita al empleado
  IF NEW.status = 'available' THEN NEW.assigned_to := NULL; END IF;
  IF NEW.status = 'occupied' AND OLD.status = 'available' THEN NEW.started_at := now(); END IF;

  -- completar: picking y packing exigen todos los ítems
  IF NEW.status = 'completed' THEN
    NEW.completed_at := now();
    IF NEW.stage = 'picking' AND EXISTS (SELECT 1 FROM sale_items WHERE sale_id = NEW.sale_id AND picked_qty < quantity) THEN
      RAISE EXCEPTION 'Faltan ítems por sacar de las estanterías';
    END IF;
    IF NEW.stage = 'packing' AND EXISTS (SELECT 1 FROM sale_items WHERE sale_id = NEW.sale_id AND packed_qty < quantity) THEN
      RAISE EXCEPTION 'Faltan ítems por empacar';
    END IF;
  END IF;

  IF NEW.status = 'verified' THEN
    IF NOT employee_can(NEW.verified_by, 'orders', 'take_' || NEW.stage) THEN
      RAISE EXCEPTION 'El empleado no tiene permiso para verificar la etapa %', NEW.stage USING ERRCODE = '42501';
    END IF;
    NEW.verified_at := now();
    IF OLD.status = 'available' THEN                              -- picking inmediato: se completa y verifica en un solo paso
      NEW.completed_at := now(); NEW.started_at := now(); NEW.assigned_to := COALESCE(NEW.assigned_to, NEW.verified_by);
      UPDATE sale_items SET picked_qty = quantity WHERE sale_id = NEW.sale_id;
    END IF;
    -- verificar la facturación = verificar el pago: aquí el pedido pasa a ser venta
    IF NEW.stage = 'invoicing' THEN PERFORM sale_confirm_payment(NEW.sale_id); END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_stage_guard BEFORE UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION sale_stage_guard();

-- Después de cada cambio: actualiza la etapa visible del pedido, lo cierra y mueve el stock al enviar
CREATE OR REPLACE FUNCTION sale_stage_after() RETURNS trigger AS $$
DECLARE v_stage TEXT; v_state TEXT;
BEGIN
  SELECT stage, status INTO v_stage, v_state FROM sale_stages WHERE sale_id = NEW.sale_id AND status <> 'verified' ORDER BY position LIMIT 1;
  IF v_stage IS NULL THEN
    UPDATE sales SET status = 'completed', current_stage = 'delivery', stage_state = 'verified' WHERE id = NEW.sale_id;
  ELSE
    UPDATE sales SET current_stage = v_stage, stage_state = v_state WHERE id = NEW.sale_id;
  END IF;

  IF NEW.stage = 'shipping' AND NEW.status = 'verified' AND OLD.status <> 'verified' THEN
    UPDATE stock_levels sl SET reserved = sl.reserved - x.q, available = sl.available - x.q, updated_at = now()
      FROM (SELECT product_location_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.sale_id GROUP BY product_location_id) x
     WHERE sl.product_location_id = x.product_location_id;
    INSERT INTO stock_movements (product_location_id, movement_type, quantity, document_type, document_id, created_by)
    SELECT i.product_location_id, CASE s.sale_type WHEN 'sale' THEN 'sale_out' ELSE 'transfer_out' END, -SUM(i.quantity), 'sale', NEW.sale_id, audit_ctx('user_id')::BIGINT
      FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE i.sale_id = NEW.sale_id GROUP BY i.product_location_id, s.sale_type;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_stage_after AFTER UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION sale_stage_after();

-- Cancelar un pedido: libera el stock reservado; lo ya pagado queda como crédito a favor; lo que se debía se anula
CREATE OR REPLACE FUNCTION sale_cancel_effects() RETURNS trigger AS $$
DECLARE r RECORD; v_charged NUMERIC;
BEGIN
  FOR r IN SELECT product_id, product_location_id, SUM(quantity) AS q FROM sale_items WHERE sale_id = NEW.id GROUP BY product_id, product_location_id LOOP
    PERFORM stock_hold(NEW.company_id, r.product_id, r.product_location_id, 'reserved', -r.q::INTEGER);
  END LOOP;
  IF NEW.customer_id IS NOT NULL THEN
    IF NEW.paid_total > 0 THEN
      INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, reason, created_by)
      VALUES (NEW.company_id, NEW.customer_id, 'in_favor', 'issue', NEW.paid_total, NEW.id, 'Pedido cancelado: ' || NEW.cancel_reason, NEW.cancelled_by);
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_charged FROM credit_entries WHERE sale_id = NEW.id AND bucket = 'pending';
    IF v_charged > 0 THEN
      INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, reason, created_by)
      VALUES (NEW.company_id, NEW.customer_id, 'pending', 'adjust', -v_charged, NEW.id, 'Pedido cancelado: ' || NEW.cancel_reason, NEW.cancelled_by);
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sale_cancel_effects AFTER UPDATE OF status ON sales FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status = 'open') EXECUTE FUNCTION sale_cancel_effects();

-- ---------- Pagos y abonos ----------
CREATE OR REPLACE FUNCTION payment_guard() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_code TEXT; v_committed NUMERIC;
BEGIN
  SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  IF TG_OP = 'INSERT' THEN
    IF s.status = 'cancelled' THEN RAISE EXCEPTION 'El pedido % está cancelado', s.serial_code; END IF;
    NEW.customer_id := COALESCE(NEW.customer_id, s.customer_id);
    SELECT COALESCE(SUM(amount), 0) INTO v_committed FROM payments WHERE sale_id = NEW.sale_id AND status IN ('review','verified');
    IF v_committed + NEW.amount > s.total THEN
      RAISE EXCEPTION 'El pago supera lo pendiente del pedido (pendiente %)', s.total - v_committed USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status = 'review' AND NEW.status IN ('verified','issue','voided'))
         OR (OLD.status = 'issue'  AND NEW.status IN ('review','voided'))
         OR (OLD.status = 'verified' AND NEW.status = 'voided')) THEN
      RAISE EXCEPTION 'El pago no puede pasar de % a %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'verified' THEN
      SELECT code INTO v_code FROM payment_methods WHERE id = NEW.payment_method_id;
      IF v_code = 'transfer' AND NEW.proof_url IS NULL THEN RAISE EXCEPTION 'La transferencia necesita su comprobante'; END IF;
      IF NOT (employee_can(NEW.verified_by, 'wallet', 'verify') OR employee_can(NEW.verified_by, 'orders', 'take_invoicing')) THEN
        RAISE EXCEPTION 'El empleado no tiene permiso para verificar pagos' USING ERRCODE = '42501';
      END IF;
      NEW.verified_at := now();
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_payment_guard BEFORE INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION payment_guard();

-- Al verificar (o anular un pago verificado) se actualiza lo pagado y el libro de créditos del cliente
CREATE OR REPLACE FUNCTION payment_effects() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_code TEXT; v_sign INTEGER;
BEGIN
  IF NEW.status = 'verified' AND OLD.status <> 'verified' THEN v_sign := 1;
  ELSIF OLD.status = 'verified' AND NEW.status = 'voided' THEN v_sign := -1;
  ELSE RETURN NEW; END IF;
  SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  SELECT code INTO v_code FROM payment_methods WHERE id = NEW.payment_method_id;
  UPDATE sales SET paid_total = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = NEW.sale_id AND status = 'verified') WHERE id = NEW.sale_id;
  IF s.payment_condition = 'credit' AND s.customer_id IS NOT NULL THEN          -- abono a una venta a crédito: baja la deuda
    INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, payment_id, created_by)
    VALUES (NEW.company_id, s.customer_id, 'pending', CASE WHEN v_sign = 1 THEN 'payment' ELSE 'adjust' END, -v_sign * NEW.amount, s.id, NEW.id, audit_ctx('user_id')::BIGINT);
  END IF;
  IF v_code = 'favor' AND s.customer_id IS NOT NULL THEN                         -- usar el saldo a favor
    INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, payment_id, created_by)
    VALUES (NEW.company_id, s.customer_id, 'in_favor', CASE WHEN v_sign = 1 THEN 'apply' ELSE 'adjust' END, -v_sign * NEW.amount, s.id, NEW.id, audit_ctx('user_id')::BIGINT);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_payment_effects AFTER UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION payment_effects();

-- ---------- Libro de créditos: solo se agrega y los saldos nunca quedan negativos ----------
CREATE OR REPLACE FUNCTION credit_entry_guard() RETURNS trigger AS $$
DECLARE v_balance NUMERIC;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'El libro de créditos no se modifica ni se borra: se agrega un ajuste'; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM credit_entries WHERE customer_id = NEW.customer_id AND bucket = NEW.bucket;
  IF v_balance + NEW.amount < 0 THEN
    RAISE EXCEPTION 'El saldo de % no puede quedar negativo', CASE NEW.bucket WHEN 'pending' THEN 'crédito pendiente' ELSE 'crédito a favor' END USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_credit_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON credit_entries FOR EACH ROW EXECUTE FUNCTION credit_entry_guard();

-- ---------- Devoluciones: solo si fue venta, y aprobarla genera crédito a favor ----------
CREATE OR REPLACE FUNCTION return_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND sale_at IS NOT NULL AND customer_id = NEW.customer_id) THEN
      RAISE EXCEPTION 'Solo se pueden devolver productos de una venta del mismo cliente';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'La devolución ya fue %', OLD.status;
  END IF;
  IF NEW.status = 'approved' AND NOT employee_can(NEW.approved_by, 'returns', 'manage') THEN
    RAISE EXCEPTION 'El empleado no tiene permiso para aprobar devoluciones' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_return_guard BEFORE INSERT OR UPDATE OF status ON returns FOR EACH ROW EXECUTE FUNCTION return_guard();

CREATE OR REPLACE FUNCTION return_credit_effects() RETURNS trigger AS $$
BEGIN
  INSERT INTO credit_entries (company_id, customer_id, bucket, entry_type, amount, sale_id, return_id, reason, created_by)
  VALUES (NEW.company_id, NEW.customer_id, 'in_favor', 'issue', NEW.total, NEW.sale_id, NEW.id, NEW.reason, audit_ctx('user_id')::BIGINT);
  INSERT INTO stock_movements (product_location_id, movement_type, quantity, document_type, document_id, created_by)
  SELECT si.product_location_id, 'return_in', SUM(ri.quantity), 'return', NEW.id, audit_ctx('user_id')::BIGINT
    FROM return_items ri JOIN sale_items si ON si.id = ri.sale_item_id WHERE ri.return_id = NEW.id AND ri.restock GROUP BY si.product_location_id;
  UPDATE stock_levels sl SET available = sl.available + x.q, updated_at = now()
    FROM (SELECT si.product_location_id, SUM(ri.quantity) AS q FROM return_items ri JOIN sale_items si ON si.id = ri.sale_item_id
           WHERE ri.return_id = NEW.id AND ri.restock GROUP BY si.product_location_id) x
   WHERE sl.product_location_id = x.product_location_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_return_credit AFTER UPDATE OF status ON returns FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending') EXECUTE FUNCTION return_credit_effects();

-- ---------- Tiempo real: cada cambio importante deja un evento y avisa a la API ----------
CREATE OR REPLACE FUNCTION rt_emit(p_company BIGINT, p_warehouse BIGINT, p_user BIGINT, p_channel TEXT, p_type TEXT, p_entity TEXT, p_entity_id BIGINT, p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE v_id BIGINT;
BEGIN
  INSERT INTO rt_events (company_id, warehouse_id, user_id, channel, event_type, entity, entity_id, payload)
  VALUES (p_company, p_warehouse, p_user, p_channel, p_type, p_entity, p_entity_id, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  PERFORM pg_notify('rt_events', jsonb_build_object('id', v_id, 'companyId', p_company, 'channel', p_channel)::text);   -- la API en Go escucha este aviso
  RETURN v_id;
END; $$ LANGUAGE plpgsql;

-- La API llama esto de vez en cuando para no acumular eventos viejos
CREATE OR REPLACE FUNCTION rt_purge(p_hours INTEGER DEFAULT 48) RETURNS BIGINT AS $$
DECLARE v_n BIGINT;
BEGIN
  DELETE FROM rt_events WHERE created_at < now() - make_interval(hours => p_hours);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;

-- Stock: cambia lo disponible, lo apartado en carritos o lo reservado (también avisa a las compañías con stock prestado)
CREATE OR REPLACE FUNCTION rt_stock_change() RETURNS trigger AS $$
DECLARE v_wh BIGINT; v_company BIGINT; v_product BIGINT; v_payload JSONB; r RECORD;
BEGIN
  SELECT pl.warehouse_id, w.company_id, pl.product_id INTO v_wh, v_company, v_product
    FROM product_locations pl JOIN warehouses w ON w.id = pl.warehouse_id WHERE pl.id = NEW.product_location_id;
  v_payload := jsonb_build_object('locationId', NEW.product_location_id, 'productId', v_product, 'warehouseId', v_wh,
    'available', NEW.available, 'inCart', NEW.in_cart, 'reserved', NEW.reserved, 'sellable', NEW.available - NEW.in_cart - NEW.reserved);
  PERFORM rt_emit(v_company, v_wh, NULL, 'stock', 'stock.updated', 'stock_levels', NEW.product_location_id, v_payload);
  FOR r IN SELECT borrower_company_id, borrower_product_id FROM stock_shares WHERE product_location_id = NEW.product_location_id AND status = 'active' LOOP
    PERFORM rt_emit(r.borrower_company_id, NULL, NULL, 'stock', 'stock.updated', 'stock_levels', NEW.product_location_id, v_payload || jsonb_build_object('productId', r.borrower_product_id));
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_stock AFTER UPDATE ON stock_levels FOR EACH ROW
  WHEN (OLD.available IS DISTINCT FROM NEW.available OR OLD.in_cart IS DISTINCT FROM NEW.in_cart OR OLD.reserved IS DISTINCT FROM NEW.reserved)
  EXECUTE FUNCTION rt_stock_change();

-- Pedidos y traslados: se crean, se completan, se cancelan o pasan a ser venta. Un traslado avisa a las DOS bodegas.
CREATE OR REPLACE FUNCTION rt_sale_change() RETURNS trigger AS $$
DECLARE v_type TEXT; v_payload JSONB; v_channel TEXT := CASE NEW.sale_type WHEN 'sale' THEN 'orders' ELSE 'transfers' END;
BEGIN
  IF TG_OP = 'INSERT' THEN v_type := 'order.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN v_type := 'order.' || NEW.status;
  ELSIF NEW.sale_at IS NOT NULL AND OLD.sale_at IS NULL THEN v_type := 'order.became_sale';
  ELSE RETURN NEW; END IF;
  v_payload := jsonb_build_object('saleId', NEW.id, 'serial', NEW.serial_code, 'saleType', NEW.sale_type, 'status', NEW.status,
    'stage', NEW.current_stage, 'stageState', NEW.stage_state, 'paymentCondition', NEW.payment_condition, 'total', NEW.total);
  PERFORM rt_emit(NEW.company_id, NEW.warehouse_id, NULL, v_channel, v_type, 'sales', NEW.id, v_payload);
  IF NEW.sale_type = 'traslade' AND NEW.aux_warehouse_id IS NOT NULL THEN
    PERFORM rt_emit(NEW.company_id, NEW.aux_warehouse_id, NULL, v_channel, v_type, 'sales', NEW.id, v_payload);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_sale AFTER INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION rt_sale_change();

-- Etapas: quién la tomó, en qué estado quedó (así nadie más la toma y todos ven la ocupación)
CREATE OR REPLACE FUNCTION rt_stage_change() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE; v_payload JSONB; v_channel TEXT;
BEGIN
  IF NEW.status = OLD.status AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
  SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  v_channel := CASE s.sale_type WHEN 'sale' THEN 'orders' ELSE 'transfers' END;
  v_payload := jsonb_build_object('saleId', s.id, 'serial', s.serial_code, 'stage', NEW.stage, 'status', NEW.status,
    'assignedTo', NEW.assigned_to, 'verifiedBy', NEW.verified_by);
  PERFORM rt_emit(s.company_id, s.warehouse_id, NULL, v_channel, 'order.stage_changed', 'sale_stages', NEW.id, v_payload);
  IF s.sale_type = 'traslade' AND s.aux_warehouse_id IS NOT NULL THEN
    PERFORM rt_emit(s.company_id, s.aux_warehouse_id, NULL, v_channel, 'order.stage_changed', 'sale_stages', NEW.id, v_payload);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_stage AFTER UPDATE ON sale_stages FOR EACH ROW EXECUTE FUNCTION rt_stage_change();

-- Pagos, créditos, devoluciones y notificaciones
CREATE OR REPLACE FUNCTION rt_payment_change() RETURNS trigger AS $$
DECLARE s sales%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO s FROM sales WHERE id = NEW.sale_id;
  PERFORM rt_emit(NEW.company_id, s.warehouse_id, NULL, 'payments', CASE TG_OP WHEN 'INSERT' THEN 'payment.created' ELSE 'payment.' || NEW.status END,
    'payments', NEW.id, jsonb_build_object('paymentId', NEW.id, 'saleId', NEW.sale_id, 'serial', s.serial_code, 'status', NEW.status, 'amount', NEW.amount));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_payment AFTER INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION rt_payment_change();

CREATE OR REPLACE FUNCTION rt_credit_change() RETURNS trigger AS $$
BEGIN
  PERFORM rt_emit(NEW.company_id, NULL, NULL, 'credit', 'credit.changed', 'credit_entries', NEW.id,
    jsonb_build_object('customerId', NEW.customer_id, 'bucket', NEW.bucket, 'type', NEW.entry_type, 'amount', NEW.amount));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_credit AFTER INSERT ON credit_entries FOR EACH ROW EXECUTE FUNCTION rt_credit_change();

CREATE OR REPLACE FUNCTION rt_return_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  PERFORM rt_emit(NEW.company_id, NULL, NULL, 'returns', CASE TG_OP WHEN 'INSERT' THEN 'return.created' ELSE 'return.' || NEW.status END,
    'returns', NEW.id, jsonb_build_object('returnId', NEW.id, 'saleId', NEW.sale_id, 'status', NEW.status, 'total', NEW.total));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_return AFTER INSERT OR UPDATE OF status ON returns FOR EACH ROW EXECUTE FUNCTION rt_return_change();

CREATE OR REPLACE FUNCTION rt_notification() RETURNS trigger AS $$
BEGIN
  PERFORM rt_emit((SELECT company_id FROM users WHERE id = NEW.user_id), NULL, NEW.user_id, 'notifications', 'notification.created', 'notifications', NEW.id,
    jsonb_build_object('title', NEW.title));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rt_notification AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION rt_notification();

-- ============================================================
-- VISTAS
-- ============================================================
-- Lo que el cliente debe y lo que tiene a favor
CREATE VIEW v_customer_credit AS
SELECT c.id AS customer_id, c.company_id, c.name, c.credit_enabled, c.credit_limit,
       COALESCE(SUM(e.amount) FILTER (WHERE e.bucket = 'pending'), 0)  AS pending_credit,   -- lo que nos debe
       COALESCE(SUM(e.amount) FILTER (WHERE e.bucket = 'in_favor'), 0) AS credit_in_favor,  -- su saldo a favor
       c.credit_limit - COALESCE(SUM(e.amount) FILTER (WHERE e.bucket = 'pending'), 0) AS available_credit
FROM customers c LEFT JOIN credit_entries e ON e.customer_id = c.id
GROUP BY c.id;

-- Stock por ubicación con lo que realmente se puede vender
CREATE VIEW v_stock AS
SELECT pl.id AS product_location_id, p.company_id, p.id AS product_id, p.code, p.name, pl.warehouse_id, sl.available, sl.in_cart, sl.reserved,
       sl.available - sl.in_cart - sl.reserved AS sellable
FROM stock_levels sl JOIN product_locations pl ON pl.id = sl.product_location_id JOIN products p ON p.id = pl.product_id;

-- ============================================================
-- AUDITORÍA (todo se resuelve en la base de datos)
-- ============================================================
INSERT INTO audit_actions (code, entity, description, requires_reason, is_sensitive) VALUES
  ('sale.cancel','sales','Cancelar un pedido',TRUE,FALSE),
  ('sale.stage_change','sale_stages','Avanzar una etapa del pedido',FALSE,FALSE),
  ('sale.stage_reject','sale_stages','Devolver una etapa para rehacerla',TRUE,FALSE),
  ('sale.to_sale','sales','El pedido pasa a ser venta (pago verificado)',FALSE,FALSE),
  ('quotation.convert','quotations','Convertir una cotización en pedido',FALSE,FALSE),
  ('payment.verify','payments','Verificar un pago o abono',FALSE,FALSE),
  ('payment.issue','payments','Marcar novedad en un pago',TRUE,FALSE),
  ('payment.void','payments','Anular un pago o abono',TRUE,FALSE),
  ('credit.adjust','credit_entries','Ajuste manual del crédito de un cliente',TRUE,TRUE),
  ('return.approve','returns','Aprobar una devolución (genera crédito a favor)',FALSE,FALSE),
  ('product.price_change','product_prices','Cambiar el precio de un producto',TRUE,FALSE),
  ('stock.adjust','stock_levels','Ajustar existencias',TRUE,FALSE),
  ('stock_share.close','stock_shares','Cerrar un préstamo de stock entre compañías',TRUE,FALSE),
  ('customer.credit_change','customers','Cambiar el cupo de crédito',TRUE,FALSE),
  ('company.deactivate','companies','Desactivar una compañía',TRUE,TRUE),
  ('user.block','users','Bloquear un usuario',TRUE,TRUE),
  ('user.role_change','user_roles','Cambiar los roles de un usuario',FALSE,TRUE),
  ('role.permission_change','role_permissions','Cambiar los permisos de un rol',FALSE,TRUE),
  ('invoice.annul','invoices','Anular una factura',TRUE,FALSE),
  ('purchase.void','purchases','Anular una compra',TRUE,FALSE),
  ('return.create','returns','Registrar una devolución',TRUE,FALSE),
  ('auth.login','users','Inicio de sesión',FALSE,FALSE),
  ('auth.login_failed','users','Intento de inicio de sesión fallido',FALSE,TRUE),
  ('audit.view','audit_events','Consultar la auditoría',FALSE,TRUE),
  ('audit.export','audit_events','Exportar la auditoría',TRUE,TRUE);

-- Registra el cambio de una fila: quién, dónde, qué cambió y el motivo (si la acción lo exige)
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger AS $$
DECLARE
  v_old JSONB; v_new JSONB; v_row JSONB; v_changed TEXT[];
  v_action TEXT; v_rule audit_actions%ROWTYPE;
  v_hidden TEXT[] := ARRAY['password_hash','access_key_enc'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW) - v_hidden;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD) - v_hidden;
    v_new := to_jsonb(NEW) - v_hidden;
    SELECT array_agg(k) INTO v_changed FROM jsonb_object_keys(v_new) AS k
     WHERE v_new -> k IS DISTINCT FROM v_old -> k AND k NOT IN ('updated_at','current_stage','stage_state');   -- columnas que la base mantiene sola
    IF v_changed IS NULL THEN RETURN NEW; END IF;       -- no cambió nada relevante
  ELSE
    v_old := to_jsonb(OLD) - v_hidden;
  END IF;

  v_row    := COALESCE(v_new, v_old);
  v_action := COALESCE(audit_ctx('action'), TG_TABLE_NAME || '.' || lower(TG_OP));
  SELECT * INTO v_rule FROM audit_actions WHERE code = v_action;
  IF FOUND AND v_rule.requires_reason AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'La acción % exige un motivo', v_action USING ERRCODE = '23514';
  END IF;

  INSERT INTO audit_events (company_id, user_id, user_name, role_code, action_code, entity, entity_id, entity_label,
                            module, warehouse_id, store_id, device_id, ip_address, reason,
                            before_data, after_data, changed_fields, request_id)
  VALUES (COALESCE((v_row ->> 'company_id')::BIGINT, CASE WHEN TG_TABLE_NAME = 'companies' THEN (v_row ->> 'id')::BIGINT END, audit_ctx('company_id')::BIGINT),
          audit_ctx('user_id')::BIGINT,
          (SELECT full_name FROM users WHERE id = audit_ctx('user_id')::BIGINT),
          audit_ctx('role'), v_action, TG_TABLE_NAME, (v_row ->> 'id')::BIGINT,
          COALESCE(v_row ->> 'serial_code', v_row ->> 'name', v_row ->> 'code', v_row ->> 'email'),
          audit_ctx('module'), audit_ctx('warehouse_id')::BIGINT, audit_ctx('store_id')::BIGINT,
          audit_ctx('device_id')::BIGINT, audit_ctx('ip')::INET, audit_ctx('reason'),
          v_old, v_new, v_changed, audit_ctx('request_id')::UUID);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Para acciones que no cambian una fila (inicio de sesión, consultar o exportar la auditoría)
CREATE OR REPLACE FUNCTION audit_record(p_action TEXT, p_entity TEXT, p_entity_id BIGINT, p_data JSONB DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_rule audit_actions%ROWTYPE;
BEGIN
  SELECT * INTO v_rule FROM audit_actions WHERE code = p_action;
  IF FOUND AND v_rule.requires_reason AND audit_ctx('reason') IS NULL THEN
    RAISE EXCEPTION 'La acción % exige un motivo', p_action USING ERRCODE = '23514';
  END IF;
  INSERT INTO audit_events (company_id, user_id, user_name, role_code, action_code, entity, entity_id, module,
                            warehouse_id, store_id, device_id, ip_address, reason, after_data, request_id)
  VALUES (audit_ctx('company_id')::BIGINT, audit_ctx('user_id')::BIGINT,
          (SELECT full_name FROM users WHERE id = audit_ctx('user_id')::BIGINT), audit_ctx('role'),
          p_action, p_entity, p_entity_id, audit_ctx('module'), audit_ctx('warehouse_id')::BIGINT,
          audit_ctx('store_id')::BIGINT, audit_ctx('device_id')::BIGINT, audit_ctx('ip')::INET,
          audit_ctx('reason'), p_data, audit_ctx('request_id')::UUID);
END; $$ LANGUAGE plpgsql;

-- El registro es de solo agregar: nadie puede editarlo, borrarlo ni vaciarlo
CREATE OR REPLACE FUNCTION audit_block_changes() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'La auditoría no se puede modificar ni borrar'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION audit_block_changes();
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION audit_block_changes();

-- Crea las particiones mensuales de la auditoría (el mes actual y los siguientes). La API la llama una vez al mes.
CREATE OR REPLACE FUNCTION audit_ensure_partitions(p_ahead INTEGER DEFAULT 2) RETURNS INTEGER AS $$
DECLARE v_month DATE; v_n INTEGER := 0; i INTEGER;
BEGIN
  FOR i IN 0..p_ahead LOOP
    v_month := (date_trunc('month', now()) + make_interval(months => i))::DATE;
    IF to_regclass(format('audit_events_%s', to_char(v_month, 'YYYY_MM'))) IS NULL THEN
      EXECUTE format('CREATE TABLE audit_events_%s PARTITION OF audit_events FOR VALUES FROM (%L) TO (%L)',
                     to_char(v_month, 'YYYY_MM'), v_month, (v_month + interval '1 month')::DATE);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$ LANGUAGE plpgsql;
SELECT audit_ensure_partitions(2);

-- Modelos principales auditados (inserción, cambio y borrado)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','company_brands','users','roles','role_permissions','user_roles','employees','customers','customer_discounts',
    'suppliers','carriers','other_parties','products','product_prices','product_suppliers','price_levels',
    'warehouses','stores','virtual_stock','stock_shares','sales','sale_stages','payments','purchases','returns','invoices','siigo_credentials']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION audit_row_change()', t);
  END LOOP;
END $$;

INSERT INTO schema_migrations (version) VALUES ('v3.0.0-borrador');

COMMIT;
