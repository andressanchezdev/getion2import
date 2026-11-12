// operations.entries · entradas del registro de formularios del panel derecho de operación: cotizaciones, traslados, caja, cartera, sedes y auditoría
// conecta con: formRegistry (las junta), los paneles de cada feature y los íconos de assets
import { createElement } from 'react'
import { CreateTransferForm, ReceiveTransferForm, TransferDetailPanel, type TrasladeItem, type CreateTransferInitialPayload } from '@/features/transfers'
import { AuditDetailPanel, type AuditEntry } from '@/features/audit'
import { QuotationDetailPanel } from '@/features/quotations'
import { CheckoutPanel, type CheckoutPayload } from '@/features/checkout'
import { CompanyWarehousesPanel } from '@/features/warehouses'
import { BillingConfigPanel, DocSeriesPanel, type DocSeries } from '@/features/billing'
import { PurchaseDetailPanel, PurchaseFormPanel, PurchasePayPanel, PurchaseReceivePanel, SupplierCatalogPanel, type PurchasePanelPayload, type SupplierCatalogPayload } from '@/features/purchases'
import { CashClosePanel, CashCollectPanel, CashOpenPanel, VerifyGoodsPanel, type CashCollectPayload, type VerifyGoodsPayload } from '@/features/cashRegister'
import { CountDetailPanel, type CountDetailPayload } from '@/features/inventory'
import { CreateAbonoPanel, AbonoDetailPanel, EnableCreditPanel, type CreateAbonoPayload, type AbonoRecord as WalletAbono, type EnableCreditPayload } from '@/features/wallet'
import { RegisterExpenseDrawer } from '@/features/shop'
import { ReasonFormPanel, type ReasonFormPayload } from '@/features/reasonPrompt'
import userIcon from '@/assets/icons/user.svg'
import shippingIcon from '@/assets/icons/shipping.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import historyIcon from '@/assets/icons/history.svg'
import fileIcon from '@/assets/icons/file-text.svg'
import cartIcon from '@/assets/icons/cart.svg'
import { BankConfirmPanel, type BankRecord } from '@/features/bank'
import { CreateReturnPanel } from '@/features/returns'
import type { DrawerFormKind } from '@/features/navigation'
import type { FormEntry } from './formEntry.types'

export const OPERATIONS_ENTRIES: Partial<Record<DrawerFormKind, FormEntry>> = {
  createReturn: {
    permission: ['returns:create'],
    icon: fileIcon,
    title: () => 'Nueva Devolución / Garantía',
    subtitle: 'Asocia una venta, productos afectados y resolución',
    render: () => createElement(CreateReturnPanel),
  },
  verifyGoods: {
    icon: fileIcon,
    title: (payload) => `Cotejar ${(payload as VerifyGoodsPayload).serial}`,
    subtitle: 'Verificación de factura contra salida física',
    render: (payload) => createElement(VerifyGoodsPanel, { key: String((payload as VerifyGoodsPayload).orderId), payload: payload as VerifyGoodsPayload }),
  },
  countDetail: {
    permission: ['stock:view_detail'],
    icon: fileIcon,
    title: (payload) => `Conteo físico #${(payload as CountDetailPayload).count.id}`,
    subtitle: 'Existencias esperadas y contadas',
    render: (payload) => createElement(CountDetailPanel, { key: `${(payload as CountDetailPayload).count.id}-${(payload as CountDetailPayload).count.status}`, payload: payload as CountDetailPayload }),
  },
  reasonForm: {
    icon: fileIcon,
    title: (payload) => (payload as ReasonFormPayload).title,
    subtitle: 'Queda registrado en la auditoría',
    render: (payload) => createElement(ReasonFormPanel, { key: (payload as ReasonFormPayload).requestId, payload: payload as ReasonFormPayload }),
  },
  bankConfirm: {
    permission: ['payments:reconcile'],
    icon: fileIcon,
    title: () => 'Confirmar entrada del banco',
    subtitle: 'Liga el movimiento a un pago por transferencia',
    render: (payload) => createElement(BankConfirmPanel, { key: String((payload as BankRecord).id), record: payload as BankRecord }),
  },
  quotationDetail: {
    permission: ['quotations:view_detail'],
    icon: fileIcon,
    title: () => 'Detalle de cotización',
    subtitle: 'Cliente, WhatsApp y renglones',
    render: (payload) => createElement(QuotationDetailPanel, { key: String(payload), quotationId: Number(payload) }),
  },
  createTransfer: {
    permission: ['transfers:create'],
    icon: shippingIcon,
    title: (payload) => {
      const p = payload as CreateTransferInitialPayload | undefined
      return p?.product ? `Solicitud: ${p.product.code}` : 'Nuevo Traslado'
    },
    subtitle: 'Reubicación y solicitud entre sedes',
    render: (payload) =>
      createElement(CreateTransferForm, {
        key: String((payload as CreateTransferInitialPayload | undefined)?.product?.id || 'transfer-draft'),
        initialPayload: payload as CreateTransferInitialPayload,
      }),
  },
  receiveTransfer: {
    permission: ['transfers:receive'],
    icon: shippingIcon,
    title: (payload) => {
      const item = (payload && typeof payload === 'object' && 'transfer' in payload ? (payload as { transfer: TrasladeItem }).transfer : payload) as TrasladeItem
      return `Recepción de traslado #${item?.serialCode ?? ''}`
    },
    subtitle: 'Recibir en destino o anular por novedad',
    render: (payload) => {
      const item = (payload && typeof payload === 'object' && 'transfer' in payload ? (payload as { transfer: TrasladeItem }).transfer : payload) as TrasladeItem
      return createElement(ReceiveTransferForm, { transfer: item })
    },
  },
  transferDetail: {
    permission: ['transfers:view_detail'],
    icon: shippingIcon,
    title: (payload) => {
      const item = (payload && typeof payload === 'object' && 'transfer' in payload ? (payload as { transfer: TrasladeItem }).transfer : payload) as TrasladeItem
      return `Detalle de Traslado ${item?.serialCode || ''}`
    },
    subtitle: 'Trazabilidad y repuestos',
    render: (payload) => {
      const item = (payload && typeof payload === 'object' && 'transfer' in payload ? (payload as { transfer: TrasladeItem }).transfer : payload) as TrasladeItem
      return createElement(TransferDetailPanel, { transfer: item })
    },
  },
  checkout: {
    permission: ['orders:create', 'quotations:create'],
    icon: cartIcon,
    title: (payload) => ((payload as CheckoutPayload).mode === 'quotation' ? 'Crear cotización' : 'Finalizar compra'),
    subtitle: 'Cliente, entrega y pago',
    render: (payload) => createElement(CheckoutPanel, { key: JSON.stringify(payload), payload: payload as CheckoutPayload }),
  },
  companyWarehouses: {
    permission: ['warehouses:view'],
    icon: userIcon,
    title: () => 'Sedes y bodegas de la empresa',
    subtitle: 'Configura las sucursales donde manejas inventario',
    render: () => createElement(CompanyWarehousesPanel),
  },
  billingConfig: {
    permission: ['warehouses:edit'],
    icon: fileIcon,
    title: () => 'Configuración de facturación',
    subtitle: 'Régimen tributario, numeración y prefijos',
    render: () => createElement(BillingConfigPanel),
  },
  docSeriesForm: {
    permission: ['warehouses:edit'],
    icon: fileIcon,
    title: (payload) => ((payload as DocSeries | undefined) ? 'Editar serie de documentos' : 'Nueva serie de documentos'),
    subtitle: 'Prefijo y rangos de numeración',
    render: (payload) => createElement(DocSeriesPanel, { payload: payload as DocSeries }),
  },
  purchaseForm: {
    permission: ['purchases:create'],
    icon: cartIcon,
    title: () => 'Nueva Orden de Compra',
    subtitle: 'Proveedor, repuestos y costos pactados',
    render: () => createElement(PurchaseFormPanel),
  },
  purchaseDetail: {
    permission: ['purchases:view_detail'],
    icon: fileIcon,
    title: (payload) => `Orden de Compra #${(payload as PurchasePanelPayload)?.id || ''}`,
    subtitle: 'Detalle de la orden, estado y trazabilidad',
    render: (payload) => createElement(PurchaseDetailPanel, { payload: payload as PurchasePanelPayload }),
  },
  purchasePay: {
    permission: ['cash:edit'],
    icon: walletIcon,
    title: () => 'Pagar recepción',
    subtitle: 'Desde la caja de la bodega, en efectivo',
    render: (payload) => createElement(PurchasePayPanel, { key: String((payload as PurchasePanelPayload).id), payload: payload as PurchasePanelPayload }),
  },
  supplierCatalog: {
    permission: ['purchases:create'],
    icon: fileIcon,
    title: (payload) => `Catálogo de ${(payload as SupplierCatalogPayload).name}`,
    subtitle: 'Productos que vende el proveedor y su costo',
    render: (payload) => createElement(SupplierCatalogPanel, { key: String((payload as SupplierCatalogPayload).id), payload: payload as SupplierCatalogPayload }),
  },
  purchaseReceive: {
    permission: ['purchases:receive'],
    icon: shippingIcon,
    title: (payload) => `Recibir Orden #${(payload as PurchasePanelPayload)?.id || ''}`,
    subtitle: 'Compara cantidades pactadas contra físicas recibidas',
    render: (payload) => createElement(PurchaseReceivePanel, { payload: payload as PurchasePanelPayload }),
  },
  cashOpen: {
    permission: ['cash:open_close'],
    icon: cartIcon,
    title: () => 'Abrir turno de caja',
    subtitle: 'Fondo inicial y responsable',
    render: () => createElement(CashOpenPanel),
  },
  cashClose: {
    permission: ['cash:open_close'],
    icon: cartIcon,
    title: () => 'Cierre de caja',
    subtitle: 'Efectivo, transferencias y abonos del turno',
    render: () => createElement(CashClosePanel),
  },
  cashCollect: {
    icon: cartIcon,
    title: (payload) => `Cobrar ${(payload as CashCollectPayload).order.serial}`,
    subtitle: 'Efectivo, transferencia o crédito',
    render: (payload) => createElement(CashCollectPanel, { key: String((payload as CashCollectPayload).order.id), payload: payload as CashCollectPayload }),
  },
  createAbono: {
    permission: ['payments:create'],
    icon: userIcon,
    title: () => 'Registrar abono',
    subtitle: 'Abono a un cliente con crédito',
    render: (payload) => createElement(CreateAbonoPanel, { payload: payload as CreateAbonoPayload | undefined }),
  },
  abonoDetail: {
    permission: ['payments:view_detail'],
    icon: fileIcon,
    title: (payload) => `Recibo ${(payload as WalletAbono).serialCode}`,
    subtitle: 'Detalle del abono',
    render: (payload) => createElement(AbonoDetailPanel, { key: String((payload as WalletAbono).id), abono: payload as WalletAbono }),
  },
  enableCredit: {
    permission: ['credits:edit'],
    icon: userIcon,
    title: () => 'Habilitar Crédito',
    subtitle: 'Asigna cupo y días de plazo a un cliente',
    render: (payload) => createElement(EnableCreditPanel, { customer: payload as EnableCreditPayload | undefined }),
  },
  auditDetail: {
    permission: ['audit:view'],
    icon: historyIcon,
    title: (payload) => `Movimiento #${(payload as AuditEntry).id}`,
    subtitle: 'Detalle de solo lectura',
    render: (payload) => createElement(AuditDetailPanel, { entry: payload as AuditEntry }),
  },
  registerExpense: {
    icon: cartIcon,
    title: () => 'Registrar Gasto de Operación',
    subtitle: 'Nómina, fletes, aseo y gastos operativos',
    render: () => createElement(RegisterExpenseDrawer),
  },
}
