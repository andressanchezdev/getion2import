-- 20261130_doc-series-prefix-per-warehouse.sql
-- Por qué: pedidos, traslados, cotizaciones, compras y pagos tienen número ÚNICO POR COMPAÑÍA (UNIQUE (company_id, serial_code)),
-- pero doc_series lleva un contador POR BODEGA y la semilla les dio a las tres bodegas el mismo prefijo y el mismo número
-- (PED-5, PED-5, PED-5). La segunda bodega que llegara a un número ya usado fallaba al crear el documento (número duplicado).
-- Arreglo: cada serie por bodega de esos tipos lleva el número de la bodega en el prefijo (PED-01-, PED-02-…). Solo cambian los
-- números FUTUROS; los documentos ya emitidos conservan el suyo. Las facturas no se tocan: son únicas por bodega y usan el prefijo DIAN.
-- Idempotente: no vuelve a cambiar una serie que ya tiene el número de su bodega.

BEGIN;

UPDATE doc_series d
SET prefix = d.prefix || LPAD(d.warehouse_id::text, 2, '0') || '-'
WHERE d.warehouse_id IS NOT NULL
  AND d.doc_type IN ('sale', 'transfer', 'quotation', 'purchase', 'payment')
  AND d.prefix NOT LIKE '%-' || LPAD(d.warehouse_id::text, 2, '0') || '-';

COMMIT;
