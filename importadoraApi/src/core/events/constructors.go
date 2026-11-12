package events

// constructors.go · arman cada Event aplicando el catálogo (canales y permisos): los servicios nunca arman Event{} a mano
// conecta con: catalog.go (RouteFor) y types.go (cuerpos); los usan los servicios dentro de db.WithTx y luego Recorder.Record
// ojo: hay constructores con nombre para los tipos que se emiten con reglas propias (entity.*, traslados, auditoría, personales);
// el resto usa New(tipo, Scope, cuerpo), que aplica la misma tabla. El stock no tiene constructor: va por Recorder.Stock

import (
	"fmt"
	"time"
)

// Scope es dónde ocurrió el cambio: la compañía, las bodegas y, si es personal, de quién es.
type Scope struct {
	CompanyID    *int64
	WarehouseIDs []int64
	ActorType    string // para eventos personales (canal actor:{tipo}:{id})
	ActorID      int64
}

// InCompany es el alcance de un cambio de compañía.
func InCompany(companyID int64) Scope { return Scope{CompanyID: &companyID} }

// InWarehouses es el alcance de un cambio de una o más bodegas de la compañía.
func InWarehouses(companyID int64, warehouseIDs ...int64) Scope {
	return Scope{CompanyID: &companyID, WarehouseIDs: warehouseIDs}
}

// ForActor es el alcance de un evento personal (carrito, notificaciones, sesión, permisos o cuenta).
func ForActor(companyID *int64, actorType string, actorID int64) Scope {
	return Scope{CompanyID: companyID, ActorType: actorType, ActorID: actorID}
}

// New arma un evento con el canal y los permisos que el catálogo da a ese tipo.
func New(t Type, sc Scope, data any) Event {
	return build(t, RouteFor(t, ""), sc, data)
}

func build(t Type, r route, sc Scope, data any) Event {
	e := Event{Type: t, CompanyID: sc.CompanyID, Platform: r.Platform, Permissions: r.Permissions, Data: data}
	if r.Warehouses {
		e.WarehouseIDs = sc.WarehouseIDs
	}
	if r.Actor && sc.ActorType != "" {
		e.ActorChannel = fmt.Sprintf("%s:%d", sc.ActorType, sc.ActorID)
	}
	return e
}

// entity arma un entity.* con el canal y los permisos de su kind (warehouseID solo lo usan los kinds por bodega, como location).
func entity(t Type, kind Kind, companyID int64, warehouseID *int64, data any) Event {
	sc := InCompany(companyID)
	if warehouseID != nil {
		sc.WarehouseIDs = []int64{*warehouseID}
	}
	return build(t, RouteFor(t, kind), sc, data)
}

// NewEntityCreated: POST de creación de un dato maestro.
func NewEntityCreated(companyID int64, warehouseID *int64, ref EntityRef, row any) Event {
	return entity(EntityCreated, ref.Kind, companyID, warehouseID, EntityCreatedData{Entity: ref, Row: row})
}

// NewEntityUpdated: PUT de edición sin cambio de estado.
func NewEntityUpdated(companyID int64, warehouseID *int64, ref EntityRef, row any, changedFields []string) Event {
	if changedFields == nil {
		changedFields = []string{}
	}
	return entity(EntityUpdated, ref.Kind, companyID, warehouseID, EntityUpdatedData{Entity: ref, Row: row, ChangedFields: changedFields})
}

// NewEntityStatus: activar, inactivar o cualquier cambio de estado de un dato maestro.
func NewEntityStatus(companyID int64, warehouseID *int64, ref EntityRef, from, to string, reason *string, row any) Event {
	return entity(EntityStatusChanged, ref.Kind, companyID, warehouseID, EntityStatusChangedData{Entity: ref, From: from, To: to, Reason: reason, Row: row})
}

// NewEntityArchived: DELETE que manda a la papelera.
func NewEntityArchived(companyID int64, warehouseID *int64, ref EntityRef, reason string, recycleBinID int64) Event {
	return entity(EntityArchived, ref.Kind, companyID, warehouseID, EntityArchivedData{Entity: ref, Reason: reason, RecycleBinID: recycleBinID})
}

// NewEntityRestored: restaurar desde la papelera.
func NewEntityRestored(companyID int64, warehouseID *int64, ref EntityRef, row any, recycleBinID int64, by Actor) Event {
	return entity(EntityRestored, ref.Kind, companyID, warehouseID, EntityRestoredData{Entity: ref, Row: row, RecycleBinID: recycleBinID, RestoredBy: by})
}

// NewEntityDeleted: borrado físico de un subregistro (códigos, ubicaciones, documentos, producto de proveedor).
func NewEntityDeleted(companyID int64, warehouseID *int64, ref EntityRef, parent *EntityParent) Event {
	return entity(EntityDeleted, ref.Kind, companyID, warehouseID, EntityDeletedData{Entity: ref, Parent: parent})
}

// NewTransferCreated va a la bodega de origen y a la de destino.
func NewTransferCreated(companyID int64, row TransferRow) Event {
	return New(TransferCreated, InWarehouses(companyID, row.OriginWarehouseID, row.DestinationWarehouseID), TransferCreatedData{Transfer: row})
}

// NewTransferStatus va a la bodega de origen y a la de destino.
func NewTransferStatus(companyID int64, data TransferStatusChangedData) Event {
	return New(TransferStatusChanged, InWarehouses(companyID, data.OriginWarehouseID, data.DestinationWarehouseID), data)
}

// ── Ventas y facturación ─────────────────────────────────────────────

// NewSaleCreated emite la creación de un pedido a las bodegas de la venta.
func NewSaleCreated(companyID, warehouseID int64, sale any) Event {
	return New(SaleCreated, InWarehouses(companyID, warehouseID), SaleCreatedData{Sale: sale})
}

// NewSaleStageChanged emite el cambio de etapa de un pedido a la bodega correspondiente.
func NewSaleStageChanged(companyID, warehouseID int64, data SaleStageChangedData) Event {
	return New(SaleStageChanged, InWarehouses(companyID, warehouseID), data)
}

// NewSalePaymentChanged emite la actualización de pagos del pedido a la bodega.
func NewSalePaymentChanged(companyID, warehouseID int64, data SalePaymentChangedData) Event {
	return New(SalePaymentChanged, InWarehouses(companyID, warehouseID), data)
}

// NewInvoiceIssued emite la expedición de una factura.
func NewInvoiceIssued(companyID, warehouseID int64, invoice InvoiceRow) Event {
	return New(InvoiceIssued, InWarehouses(companyID, warehouseID), InvoiceIssuedData{Invoice: invoice})
}

// NewInvoiceAnnulled emite la anulación de una factura.
func NewInvoiceAnnulled(companyID, warehouseID int64, data InvoiceAnnulledData) Event {
	return New(InvoiceAnnulled, InWarehouses(companyID, warehouseID), data)
}

// ── Pagos, cartera y bancos ──────────────────────────────────────────

// NewPaymentCreated emite la creación de un pago a la compañía.
func NewPaymentCreated(companyID int64, payment any) Event {
	return New(PaymentCreated, InCompany(companyID), PaymentCreatedData{Payment: payment})
}

// NewPaymentStatusChanged emite el cambio de estado de un pago.
func NewPaymentStatusChanged(companyID int64, data PaymentStatusChangedData) Event {
	return New(PaymentStatusChanged, InCompany(companyID), data)
}

// NewCreditBalanceChanged emite el cambio en el cupo/saldo de crédito del cliente.
func NewCreditBalanceChanged(companyID int64, data CreditBalanceChangedData) Event {
	return New(CreditBalanceChanged, InCompany(companyID), data)
}

// NewBankStatementImported emite la importación de un extracto bancario.
func NewBankStatementImported(companyID int64, data BankStatementImportedData) Event {
	return New(BankStatementImported, InCompany(companyID), data)
}

// NewBankRecordStatusChanged emite el cambio de estado de un movimiento bancario.
func NewBankRecordStatusChanged(companyID int64, data BankRecordStatusChangedData) Event {
	return New(BankRecordStatusChanged, InCompany(companyID), data)
}

// ── Caja ─────────────────────────────────────────────────────────────

// NewCashSessionStatusChanged emite apertura/cierre de turno de caja.
func NewCashSessionStatusChanged(companyID, warehouseID int64, data CashSessionStatusChangedData) Event {
	return New(CashSessionStatusChanged, InWarehouses(companyID, warehouseID), data)
}

// NewCashSessionTotalsChanged emite actualización de totales en caja abierta.
func NewCashSessionTotalsChanged(companyID, warehouseID int64, data CashSessionTotalsChangedData) Event {
	return New(CashSessionTotalsChanged, InWarehouses(companyID, warehouseID), data)
}

// NewCashExpenseRecorded emite el registro de un gasto de caja.
func NewCashExpenseRecorded(companyID, warehouseID int64, expense CashExpense) Event {
	return New(CashExpenseRecorded, InWarehouses(companyID, warehouseID), CashExpenseRecordedData{Expense: expense})
}

// ── Compras y devoluciones ───────────────────────────────────────────

// NewPurchaseCreated emite la creación de una orden de compra.
func NewPurchaseCreated(companyID, warehouseID int64, purchase any) Event {
	return New(PurchaseCreated, InWarehouses(companyID, warehouseID), PurchaseCreatedData{Purchase: purchase})
}

// NewPurchaseStatusChanged emite el cambio de estado de una compra (recepción/anulación).
func NewPurchaseStatusChanged(companyID, warehouseID int64, data PurchaseStatusChangedData) Event {
	return New(PurchaseStatusChanged, InWarehouses(companyID, warehouseID), data)
}

// NewPurchasePaymentRecorded emite un pago aplicado a una orden de compra.
func NewPurchasePaymentRecorded(companyID, warehouseID int64, data PurchasePaymentRecordedData) Event {
	return New(PurchasePaymentRecorded, InWarehouses(companyID, warehouseID), data)
}

// NewSupplierCatalogImported emite la notificación de importación de catálogo.
func NewSupplierCatalogImported(companyID int64, data SupplierCatalogImportedData) Event {
	return New(SupplierCatalogImported, InCompany(companyID), data)
}

// NewReturnCreated emite una nueva solicitud de devolución.
func NewReturnCreated(companyID, warehouseID int64, returnRow any) Event {
	return New(ReturnCreated, InWarehouses(companyID, warehouseID), ReturnCreatedData{Return: returnRow})
}

// NewReturnStatusChanged emite la aprobación o rechazo de una devolución.
func NewReturnStatusChanged(companyID, warehouseID int64, data ReturnStatusChangedData) Event {
	return New(ReturnStatusChanged, InWarehouses(companyID, warehouseID), data)
}

// ── Cotizaciones y conteos ───────────────────────────────────────────

// NewQuotationCreated emite una nueva cotización.
func NewQuotationCreated(companyID int64, quotation any) Event {
	return New(QuotationCreated, InCompany(companyID), QuotationCreatedData{Quotation: quotation})
}

// NewQuotationUpdated emite la modificación de una cotización.
func NewQuotationUpdated(companyID int64, ref EntityRef, row any, changedFields []string) Event {
	if changedFields == nil {
		changedFields = []string{}
	}
	return New(QuotationUpdated, InCompany(companyID), QuotationUpdatedData{Entity: ref, Row: row, ChangedFields: changedFields})
}

// NewQuotationStatusChanged emite el cambio de estado de una cotización.
func NewQuotationStatusChanged(companyID int64, data QuotationStatusChangedData) Event {
	return New(QuotationStatusChanged, InCompany(companyID), data)
}

// NewCountCreated emite un nuevo conteo físico.
func NewCountCreated(companyID, warehouseID int64, count CountRow) Event {
	return New(CountCreated, InWarehouses(companyID, warehouseID), CountCreatedData{Count: count})
}

// NewCountProgressChanged emite el progreso de conteo.
func NewCountProgressChanged(companyID, warehouseID int64, data CountProgressChangedData) Event {
	return New(CountProgressChanged, InWarehouses(companyID, warehouseID), data)
}

// NewCountStatusChanged emite verificación o corroboración de conteo.
func NewCountStatusChanged(companyID, warehouseID int64, data CountStatusChangedData) Event {
	return New(CountStatusChanged, InWarehouses(companyID, warehouseID), data)
}

// ── Precios, notificaciones y respaldos ───────────────────────────────

// NewProductPricesChanged emite cambios en la lista de precios de un producto.
func NewProductPricesChanged(companyID int64, data ProductPricesChangedData) Event {
	return New(ProductPricesChanged, InCompany(companyID), data)
}

// NewNotificationCreated emite una notificación al canal del actor.
func NewNotificationCreated(companyID *int64, actorType string, actorID int64, data NotificationCreatedData) Event {
	return NewPersonal(NotificationCreated, companyID, actorType, actorID, data)
}

// NewNotificationRead emite la lectura de notificaciones al canal del actor.
func NewNotificationRead(companyID *int64, actorType string, actorID int64, data NotificationReadData) Event {
	return NewPersonal(NotificationRead, companyID, actorType, actorID, data)
}

// NewBackupCreated emite la creación de un respaldo al canal platform.
func NewBackupCreated(backup BackupInfo) Event {
	return build(BackupCreated, route{Platform: true}, Scope{}, BackupCreatedData{Backup: backup})
}

// NewBackupRestored emite la restauración de un respaldo al canal platform.
func NewBackupRestored(backupID string) Event {
	return build(BackupRestored, route{Platform: true}, Scope{}, BackupRestoredData{BackupID: backupID})
}

// NewAuditLogged: con compañía va a company:{id}; sin compañía (acciones de plataforma) va a platform.
func NewAuditLogged(companyID *int64, data AuditLoggedData) Event {
	e := New(AuditLogged, Scope{CompanyID: companyID}, data)
	if companyID == nil {
		e.Platform = true
	}
	return e
}

// NewSessionRevoked emite la revocación de una o todas las sesiones de un actor.
func NewSessionRevoked(companyID *int64, actorType string, actorID int64, sessionID, exceptSessionID *int64, reason string) Event {
	return NewPersonal(SessionRevoked, companyID, actorType, actorID, SessionRevokedData{
		SessionID:       sessionID,
		ExceptSessionID: exceptSessionID,
		Reason:          reason,
	})
}

// NewPermissionsChanged emite la actualización de permisos asignados a un actor.
func NewPermissionsChanged(companyID *int64, actorType string, actorID int64, permissions []string) Event {
	return NewPersonal(PermissionsChanged, companyID, actorType, actorID, PermissionsChangedData{
		ActorType:   actorType,
		ActorID:     actorID,
		Permissions: permissions,
	})
}

// NewAccountUpdated emite la actualización del perfil propio del usuario autenticado.
func NewAccountUpdated(companyID *int64, actorType string, actorID int64, user any) Event {
	return NewPersonal(AccountUpdated, companyID, actorType, actorID, AccountUpdatedData{
		User:    user,
		Version: time.Now().UTC(),
	})
}

// NewPersonal arma un evento del canal personal (carrito, notificaciones, sesión, permisos o cuenta).
func NewPersonal(t Type, companyID *int64, actorType string, actorID int64, data any) Event {
	return New(t, ForActor(companyID, actorType, actorID), data)
}
