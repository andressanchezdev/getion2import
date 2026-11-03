// suppliers.endpoints · rutas del backend de compras, proveedores y Siigo
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const SUPPLIERS_ENDPOINTS = {
  // API en Go (proveedores y transportadoras, tabla externals): GET /externals (?kind&search&isActive&page&pageSize), POST crea, PUT /:id cambia (también el estado con { isActive }), DELETE /:id borra
  EXTERNALS: {
    LIST: '/externals',
    BY_ID: (externalId: number) => `/externals/${externalId}`,
  },
  // API en Go (compras): una orden pasa de ordered a partial o received al recibir mercancía; voided si se anula sin haber recibido nada
  PURCHASES: {
    LIST: '/purchases', // GET ?supplierId&warehouseId&status&q&page&pageSize lista las órdenes; POST crea una con sus items
    BY_ID: (purchaseId: number) => `/purchases/${purchaseId}`, // GET: la orden con sus items
    EXPORT_EXCEL: (purchaseId: number) => `/purchases/${purchaseId}/export/excel`, // GET: el Excel de la orden para el proveedor (responde un archivo, no JSON)
    RECEIVE: (purchaseId: number) => `/purchases/${purchaseId}/receive`, // POST { items:[{ purchaseItemId, quantity, location? }] }: ingresa mercancía a la bodega, en la ubicación elegida
    VOID: (purchaseId: number) => `/purchases/${purchaseId}/void`, // POST: anula la orden si no se ha recibido nada
    SUPPLIER_PRODUCTS: (supplierId: number) => `/purchases/suppliers/${supplierId}/products`, // GET: los productos del catálogo del proveedor con su código y costo
    SUPPLIER_CATALOG_UPLOAD: (supplierId: number) => `/purchases/suppliers/${supplierId}/catalog/upload`, // POST multipart (campo file): carga el Excel del catálogo del proveedor
  },
  // Suppliers (agregado desde el Swagger)
  SUPPLIERS: {
    CREATE: '/suppliers/create', // SP: crea un proveedor
    DELETE: '/suppliers/delete', // SP: borra un proveedor
    DETAIL: '/suppliers/detail', // FUNCIONA con {supplierId:19}, 200; con supplierId:0 responde 404 "Supplier not found"
    LIST: '/suppliers/list', // FUNCIONA con {companyId, page, pageSize}, 200; devuelve supplierId, name, documentType, documentId, email, phone, address, city, country
    PRODUCTS: '/suppliers/products', // RESPONDE 200 "Products retrieved successfully" con {supplierId:19, page, pageSize} pero data = null (no se sabe si el proveedor no tiene productos o si falla)
    PRODUCTS_ADD: '/suppliers/products/add', // SP: agrega un producto a un proveedor
    PRODUCTS_REMOVE: '/suppliers/products/remove', // SP: quita un producto de un proveedor
    PRODUCTS_UPDATE: '/suppliers/products/update', // SP: modifica un producto de un proveedor
    SUMMARY: '/suppliers/summary', // FUNCIONA, GET, 200; devuelve totalSuppliers, activeSuppliers, totalProducts y totalCreditLimit
    UPDATE: '/suppliers/update', // SP: modifica un proveedor
  },
  // Siigo (agregado desde el Swagger)
  SIIGO: {
    ACCOUNT_GROUPS: '/siigo/account-groups', // SP
    COST_CENTERS: '/siigo/cost-centers', // 
    CREDIT_NOTE: '/siigo/credit-note', //
    CUSTOMERS: '/siigo/customers', // 
    DOCUMENT_TYPES: '/siigo/document-types', //
    INVOICES: '/siigo/invoices', //
    PAYMENT_TYPES: '/siigo/payment-types', //
    PRODUCTS: '/siigo/products', //   
    SYNC_CUSTOMERS: '/siigo/sync/customers', // 
    SYNC_INVOICE: '/siigo/sync/invoice', // 
    SYNC_INVOICES: '/siigo/sync/invoices', //
    SYNC_PRODUCTS: '/siigo/sync/products', // 
    TAXES: '/siigo/taxes', //
    TEST_CONNECTION: '/siigo/test-connection', // 
    USERS: '/siigo/users', // 
    WAREHOUSES: '/siigo/warehouses', //
  },
}
