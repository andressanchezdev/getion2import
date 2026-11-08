// quotations.api.types · lo que responde y recibe la API en Go en cotizaciones (QuotationResponse) y los datos de contacto del cliente, con los nombres del backend
// conecta con: quotations.adapter (convierte a Quotation) y quotations.service
// ojo: la API no guarda un WhatsApp aparte: es el celular (o el teléfono) del cliente registrado, por eso se piden los clientes para unirlos a cada cotización
export interface QuotationItemDto {
  id: number
  productId: number
  productCode?: string
  productName?: string
  quantity: number
  unitPrice: number
  discount?: number
  lineTotal: number
}

export interface QuotationDto {
  id: number
  serialCode?: string
  customerId: number
  customerName?: string
  employeeId?: number
  employeeName?: string
  status: string // 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  validUntil?: string | null
  subtotal?: number
  discountTotal?: number
  ivaTotal?: number
  total: number
  notes?: string | null
  createdAt: string
  items?: QuotationItemDto[] | null
}

// los datos de un cliente que sirven para saber a qué número se envía (GET /customers)
export interface QuotationCustomerDto {
  id: number
  phone?: string | null
  mobile?: string | null
}

// cuerpo de POST /quotations: el cliente es obligatorio y cada renglón lleva su precio unitario
export interface CreateQuotationBody {
  customerId: number
  notes?: string
  items: Array<{ productId: number; quantity: number; unitPrice: number }>
}

export interface UpdateQuotationBody {
  status?: string
  notes?: string
}
