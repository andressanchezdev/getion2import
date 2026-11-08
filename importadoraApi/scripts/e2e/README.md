# Pruebas end-to-end por HTTP

Recorren la API real (login, permisos, aislamiento entre compañías, motivo al desactivar, anulación de facturas).

Requisitos: API en marcha (por defecto `http://localhost:3001`, o `E2E_BASE=...`) sobre una base creada con `startdb.pgsql`
(usan el superadmin de la semilla `superadmin1@importadora.com` / `123456`) y Python 3.

```bash
python flow_company_admin.py        # superadmin crea compañía y admin; el admin gestiona lo suyo y no ve lo ajeno
python flow_sale_annul.py           # venta completa hasta factura y anulación real con auditoría
python flow_deactivation_reason.py  # desactivar por PUT exige motivo (10 a 100)
```

Ojo: cada corrida **crea datos nuevos** (compañías «Compania … E2E», admins `…@e2e.com`). Úsalas solo en bases locales o de pruebas.
