package types

// TypeFacturation coincide con warehouse_facturation.type_facturation ('natural' | 'juridica').
type TypeFacturation string

const (
	FacturationNatural  TypeFacturation = "natural"
	FacturationJuridica TypeFacturation = "juridica"
)

// DocSeriesType coincide con doc_series.doc_type.
type DocSeriesType string

const (
	SeriesSale      DocSeriesType = "sale"
	SeriesTransfer  DocSeriesType = "transfer"
	SeriesQuotation DocSeriesType = "quotation"
	SeriesPurchase  DocSeriesType = "purchase"
	SeriesPayment   DocSeriesType = "payment"
	SeriesInvoice   DocSeriesType = "invoice"
)

