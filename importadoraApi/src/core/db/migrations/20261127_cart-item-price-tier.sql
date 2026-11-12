-- 20261127_cart-item-price-tier.sql
-- Agrega columna price_tier a la tabla cart_items para asociar el nivel de precio unitario por producto en el carrito

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS price_tier VARCHAR(10) NOT NULL DEFAULT 'p1' 
CHECK (price_tier IN ('p1', 'p2', 'p3', 'p4'));

