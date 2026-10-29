package types

// PersonType coincide con customers.person_type ('natural' | 'legal').
type PersonType string

const (
	PersonNatural PersonType = "natural"
	PersonLegal   PersonType = "legal"
)

// PriceTier coincide con las listas p1..p4 en products.prices, customers, carts y sales.
type PriceTier string

const (
	PriceTierP1 PriceTier = "p1"
	PriceTierP2 PriceTier = "p2"
	PriceTierP3 PriceTier = "p3"
	PriceTierP4 PriceTier = "p4"
)

// CustomerStatus coincide con customers.status.
type CustomerStatus string

const (
	CustomerPending  CustomerStatus = "pending"
	CustomerActive   CustomerStatus = "active"
	CustomerOverdue  CustomerStatus = "overdue"
	CustomerInactive CustomerStatus = "inactive"
)

// CustomerDocType coincide con customer_documents.doc_type.
type CustomerDocType string

const (
	CustomerDocRUT        CustomerDocType = "rut"
	CustomerDocIDCard     CustomerDocType = "id_card"
	CustomerDocChamber    CustomerDocType = "chamber"
	CustomerDocCreditForm CustomerDocType = "credit_form"
	CustomerDocOther      CustomerDocType = "other"
)

// ExternalKind coincide con externals.kind ('supplier' | 'carrier' | 'other').
type ExternalKind string

const (
	ExternalSupplier ExternalKind = "supplier"
	ExternalCarrier  ExternalKind = "carrier"
	ExternalOther    ExternalKind = "other"
)

