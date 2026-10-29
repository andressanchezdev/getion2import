package types

// PaymentMethod coincide con sales.payment_method ('cash' | 'transfer' | 'credit')
// y payments.method ('cash' | 'transfer'). El saldo a favor no es un método aparte:
// opera de forma lógica como saldo positivo en credit_entries / v_customer_credit_summary.
type PaymentMethod string

const (
	PaymentCash     PaymentMethod = "cash"
	PaymentTransfer PaymentMethod = "transfer"
	PaymentCredit   PaymentMethod = "credit"
)

// PaymentCondition coincide con sales.payment_condition ('cash' | 'credit').
type PaymentCondition string

const (
	ConditionCash   PaymentCondition = "cash"
	ConditionCredit PaymentCondition = "credit"
)

// PaymentStatus coincide con payments.status ('review' | 'verified' | 'issue' | 'voided').
type PaymentStatus string

const (
	PaymentStatusReview   PaymentStatus = "review"
	PaymentStatusVerified PaymentStatus = "verified"
	PaymentStatusIssue    PaymentStatus = "issue"
	PaymentStatusVoided   PaymentStatus = "voided"
)

// CreditEntryType coincide con credit_entries.entry_type ('charge' | 'payment' | 'return' | 'adjust').
// Signo lógico de credit_entries.amount:
//   - 'charge' (< 0): cargo que consume crédito del cliente.
//   - 'payment' (> 0): abono verificado al crédito.
//   - 'return' (> 0): devolución aprobada acreditada al cliente (puede dejar saldo positivo a favor).
//   - 'adjust' (<> 0): ajuste contable auditado.
type CreditEntryType string

const (
	EntryCharge  CreditEntryType = "charge"
	EntryPayment CreditEntryType = "payment"
	EntryReturn  CreditEntryType = "return"
	EntryAdjust  CreditEntryType = "adjust"
)

