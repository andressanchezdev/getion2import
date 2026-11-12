package events

// causes.go · causas de un cambio de stock (StockCause) con el documento que lo provocó; una función por causa del contrato
// conecta con: recorder.go (Stock las recibe) y los escritores de stock de inventario, ventas, traslados, compras, devoluciones y conteos

func cause(kind, refType string, refID int64, serial string) StockCause {
	c := StockCause{Type: kind}
	if refType != "" {
		c.ReferenceType = &refType
	}
	if refID > 0 {
		c.ReferenceID = &refID
	}
	if serial != "" {
		c.ReferenceSerial = &serial
	}
	return c
}

// CauseSaleOut: el pedido salió (enviado) y descontó las unidades.
func CauseSaleOut(saleID int64, serial string) StockCause {
	return cause("sale_out", "sale", saleID, serial)
}

// CauseReservation: el pedido apartó unidades al crearse.
func CauseReservation(saleID int64, serial string) StockCause {
	return cause("reservation", "sale", saleID, serial)
}

// CauseRelease: el pedido se canceló y liberó lo apartado.
func CauseRelease(saleID int64, serial string) StockCause {
	return cause("release", "sale", saleID, serial)
}

// CauseTransferOut: el traslado salió de la bodega de origen.
func CauseTransferOut(transferID int64, serial string) StockCause {
	return cause("transfer_out", "transfer", transferID, serial)
}

// CauseTransferIn: el traslado entró a la bodega de destino.
func CauseTransferIn(transferID int64, serial string) StockCause {
	return cause("transfer_in", "transfer", transferID, serial)
}

// CauseTransferReservation: el traslado apartó unidades al crearse.
func CauseTransferReservation(transferID int64, serial string) StockCause {
	return cause("reservation", "transfer", transferID, serial)
}

// CauseTransferRelease: el traslado se canceló y liberó lo apartado.
func CauseTransferRelease(transferID int64, serial string) StockCause {
	return cause("release", "transfer", transferID, serial)
}

// CausePurchaseIn: entrada por recepción de compra.
func CausePurchaseIn(purchaseID int64, serial string) StockCause {
	return cause("purchase_in", "purchase", purchaseID, serial)
}

// CauseReturnIn: entrada por devolución aprobada.
func CauseReturnIn(returnID int64) StockCause { return cause("return_in", "return", returnID, "") }

// CauseCountAdjust: ajuste al corroborar un conteo físico.
func CauseCountAdjust(countID int64) StockCause { return cause("count_adjust", "count", countID, "") }

// CauseAdjustment: ajuste manual (POST /stock/adjust, /stock/assign o stock inicial).
func CauseAdjustment() StockCause { return cause("adjustment", "manual", 0, "") }

// CauseRelocation: reubicación dentro de la bodega.
func CauseRelocation() StockCause { return cause("relocation", "manual", 0, "") }
