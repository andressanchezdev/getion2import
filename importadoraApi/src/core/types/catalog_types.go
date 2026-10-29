package types

// ProductStatus coincide con products.status ('draft' | 'active' | 'inactive' | 'discontinued').
type ProductStatus string

const (
	ProductDraft        ProductStatus = "draft"
	ProductActive       ProductStatus = "active"
	ProductInactive     ProductStatus = "inactive"
	ProductDiscontinued ProductStatus = "discontinued"
)

// ProductCodeType coincide con product_codes.code_type.
type ProductCodeType string

const (
	CodeSKU       ProductCodeType = "sku"
	CodeReference ProductCodeType = "reference"
	CodeBarcode   ProductCodeType = "barcode"
	CodeSupplier  ProductCodeType = "supplier"
	CodeOEM       ProductCodeType = "oem"
)

