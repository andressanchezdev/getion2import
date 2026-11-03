// catalog.endpoints · rutas del backend de productos, búsqueda y catálogos (marcas, categorías y modelos)
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const CATALOG_ENDPOINTS = {
  // Productos, búsqueda e inventario de lectura
  PRODUCTS: {
    BY_ID: (productId: number) => `/products/${productId}`, // PUT { prices: { p1, p2, p3, p4 } }: cambia las tarifas del producto (API en Go; responde el producto con todas sus tarifas)
    LIST: '/products', // FUNCIONA, 200 "Products successfully obtained" con {companyId, page, pageSize}; devuelve productId, code, description, categoryName, modelName, brandName, brandImage, isActive, isPromotion, locations, prices e images
    REGISTER: '/products/register', // ERROR 404 "The route you are looking for does not exist" con {companyId, brandId, categoryId, modelId, taxId, code, description, isActive, lastCost, purchasePrice, maxStock, minStock}; el Swagger la lista pero el backend no la tiene publicada; el producto no se crea (no sale en /products ni en /search)
    //SEARCH: '/inventory/search', // FUNCIONA, búsqueda por texto en código, descripción, marca, modelo o categoría
    // API en Go: GET /products con ?page&pageSize&status&brandId&categoryId&companyId (antes era POST con cuerpo); la búsqueda es GET /products/search?q=
    SEARCH: '/products/search', // GET con ?q=&page=&pageSize=; busca por código, nombre, marca, modelo o categoría
  },
  // Búsqueda universal (varias entidades a la vez)
  SEARCH: {
    UNIVERSAL: '/search', // FUNCIONA con {companyId, query, type:"product", limit}, 200 "Search completed successfully" y la misma forma de fila que /products
  },
  // Catálogos grupo base de el endpoint
  CATALOGS: {
    CATEGORIES: '/categories', //FUNCIONA-DEBE LLEVAR companyID, page, pagezise, y devuelve un 200 con todas las categorias
    CATEGORIES_REGISTER: '/categories/register', //funciona devuelve el categorieId junto con el mensaje de success 200 OK
    // PRUEBA DE HOY (ANDRES): responde 201 "Category registered successfully" pero con categoryId = 0 y NO crea nada: el total de /categories sigue igual (529) y el nombre no aparece en ninguna pagina
    CATEGORIES_UPDATE: '/categories/update',// ENVIA UN ERROR DE EL SERVIDOR AL ENVIAR LA PETICION, NO ACTUALIZA, SE ENVIAN
    // SIiN PRoOBAR HOY: no se pudo crear una categoria propia para actualizarla (el registro no crea nada) y se evito tocar las categorias reales
    //"categoryId","name"
    BRANDS: '/brands', // FUNCIONA, 200 "Brands successfully obtained" con {companyId, page, pageSize}; devuelve brandId, name, image
    BRANDS_REGISTER: '/brands/register', // FUNCIONA con {companyId, name}, 201 "Brand created successfully" y devuelve {brandId, name, image}; la marca aparece de inmediato en /brands
    BRANDS_UPDATE: '/brands/update', // FUNCIONA, es PUT con {brandId, name}, 200 "Brand updated successfully"; el nombre cambia en /brands
    //      MODELS: '/models',
    //      MODELS_REGISTER: '/models/register',
    //      MODELS_UPDATE: '/models/update',
  },
  MODELS: {
    BASE: '/models', //FUNCIOAN CORRECTAMENTE DEVUELVE OBJETOS DENTRO DE MODEL, MODELID, NAME
    REGISTER: '/models/register', //FUNCIONA CORRECTAMENTE, SE CREA EL MODELO CON LOS MISMOS CAMPOS MODELID, NAME
    // PRUEBA ANDRES: responde 201 "Model registered successfully" pero con modelId = 0 y NO crea nada: el total de /models sigue igual (552) y el nombre no aparece en ninguna pagina
    UPDATE: '/models/update', //FUNCIONA, SE RECIBE RESPUESTA 200, PERO NO PUDE VER EL PRODUCTO CREADO CON LOS DATOSW E PRUENA
    // SiN PROBA HOY: no se pudo crear un modelo propio para actualizarlo (el registro no crea nada) y se evito tocar los modelos reales
  },
}
