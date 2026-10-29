package types

// PurchaseStatus coincide con purchases.status ('draft' | 'ordered' | 'partial' | 'received' | 'voided').
type PurchaseStatus string

const (
	PurchaseDraft    PurchaseStatus = "draft"
	PurchaseOrdered  PurchaseStatus = "ordered"
	PurchasePartial  PurchaseStatus = "partial"
	PurchaseReceived PurchaseStatus = "received"
	PurchaseVoided   PurchaseStatus = "voided"
)

// NotificationKind coincide con notifications.kind ('info' | 'success' | 'warning' | 'error').
type NotificationKind string

const (
	NotificationInfo    NotificationKind = "info"
	NotificationSuccess NotificationKind = "success"
	NotificationWarning NotificationKind = "warning"
	NotificationError   NotificationKind = "error"
)

