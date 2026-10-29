package types

// TransferStatus coincide con transfers.status ('pending' | 'in_transit' | 'received' | 'cancelled').
type TransferStatus string

const (
	TransferPending   TransferStatus = "pending"
	TransferInTransit TransferStatus = "in_transit"
	TransferReceived  TransferStatus = "received"
	TransferCancelled TransferStatus = "cancelled"
)

// MovementType coincide con audit_movements.movement_type.
type MovementType string

const (
	MovementPurchaseIn  MovementType = "purchase_in"
	MovementSaleOut     MovementType = "sale_out"
	MovementTransferOut MovementType = "transfer_out"
	MovementTransferIn  MovementType = "transfer_in"
	MovementAdjustment  MovementType = "adjustment"
	MovementReturnIn    MovementType = "return_in"
	MovementCountAdjust MovementType = "count_adjust"
)

// CountStatus coincide con counts.status ('pending' | 'verified' | 'corroborated').
type CountStatus string

const (
	CountPending      CountStatus = "pending"
	CountVerified     CountStatus = "verified"
	CountCorroborated CountStatus = "corroborated"
)

