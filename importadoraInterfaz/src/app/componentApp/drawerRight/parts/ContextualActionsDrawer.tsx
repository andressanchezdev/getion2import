import React from 'react'
import './ContextualActionsDrawer.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { setActiveModule, setActiveSubitem, setRightDrawerOpen, type ERPModule } from '@/features/navigation'
import plusIcon from '@/assets/icons/new.svg'
import fileTextIcon from '@/assets/icons/file-text.svg'
import cloudUploadIcon from '@/assets/icons/cloud-upload.svg'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import receiptIcon from '@/assets/icons/receipt.svg'
import shippingIcon from '@/assets/icons/shipping.svg'
import storeIcon from '@/assets/icons/store.svg'
import userIcon from '@/assets/icons/user.svg'
import { MODULE_HEADER_TITLES } from '@/features/navigation'

interface ActionItem {
  id: string
  label: string
  description: string
  icon: string
  onClick: () => void
  badge?: string
}

export const ContextualActionsDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  const { activeModule, activeSubitem } = useAppSelector((state) => state.ui)

  const handleNavigate = (module: ERPModule, subitem: string) => {
    dispatch(setActiveModule(module))
    dispatch(setActiveSubitem(subitem))
    dispatch(setRightDrawerOpen(false))
  }

  // Generar acciones según la gestión activa
  const getActions = (): ActionItem[] => {
    switch (activeModule) {
      case 'shop':
        return [
          {
            id: 'cart',
            label: 'Ver Carrito de Venta',
            description: 'Consultar ítems agregados y checkout',
            icon: storeIcon,
            onClick: () => dispatch(setRightDrawerOpen(true)),
          },
          {
            id: 'quote',
            label: 'Crear Cotización',
            description: 'Generar cotización formal para cliente',
            icon: fileTextIcon,
            onClick: () => handleNavigate('shop', 'quotations'),
          },
        ]
      case 'cashRegister':
      case 'sales':
        return [
          {
            id: 'pos',
            label: 'Nueva Venta / Factura POS',
            description: 'Cobro rápido de mostrador o crédito',
            icon: receiptIcon,
            onClick: () => handleNavigate('cashRegister', 'posBilling'),
          },
          {
            id: 'return',
            label: 'Devolución & Garantía',
            description: 'Registrar falla de repuesto o error de despacho',
            icon: shippingIcon,
            onClick: () => handleNavigate('cashRegister', 'returns'),
          },
          {
            id: 'orders',
            label: 'Pedidos por Despachar',
            description: 'Revisar órdenes confirmadas listas para entrega',
            icon: fileTextIcon,
            onClick: () => handleNavigate('shop', 'orders'),
          },
        ]
      case 'purchases':
        return [
          {
            id: 'new_po',
            label: 'Nueva Orden de Compra',
            description: 'Solicitar repuestos al proveedor',
            icon: plusIcon,
            onClick: () => handleNavigate('purchases', 'purchaseOrders'),
          },
          {
            id: 'dl_excel',
            label: 'Descargar Excel para WhatsApp',
            description: 'Generar archivo con la lista para enviar al proveedor',
            icon: cloudDownloadIcon,
            onClick: () => handleNavigate('purchases', 'purchaseOrders'),
          },
          {
            id: 'rcv',
            label: 'Recepción en Bodega',
            description: 'Confirmar mercancía física recibida por el bodeguero',
            icon: shippingIcon,
            onClick: () => handleNavigate('purchases', 'receiving'),
          },
        ]
      case 'inventory':
      case 'transfers':
        return [
          {
            id: 'new_prod',
            label: 'Crear Nuevo Repuesto',
            description: 'Registrar producto, precios P1..P4 y código OEM',
            icon: plusIcon,
            onClick: () => handleNavigate('inventory', 'products'),
          },
          {
            id: 'new_tr',
            label: 'Solicitar Traslado de Bodega',
            description: 'Mover repuestos entre Bodegas 1, 2 y 3',
            icon: shippingIcon,
            onClick: () => handleNavigate('inventory', 'transfers'),
          },
        ]
      case 'wallet':
        return [
          {
            id: 'bank_recon',
            label: 'Careo Extracto Bancario',
            description: 'Cargar PDF de Bancolombia y conciliar pagos',
            icon: cloudUploadIcon,
            onClick: () => handleNavigate('wallet', 'bankReconciliation'),
          },
          {
            id: 'credit_check',
            label: 'Revisar Alertas de Crédito >= 70%',
            description: 'Clientes próximos a copar su cupo comercial',
            icon: fileTextIcon,
            onClick: () => handleNavigate('wallet', 'creditClients'),
          },
        ]
      case 'thirdParties':
        return [
          {
            id: 'new_cust',
            label: 'Registrar Nuevo Cliente',
            description: 'Ficha con datos fiscales y cupo de crédito',
            icon: userIcon,
            onClick: () => handleNavigate('thirdParties', 'customers'),
          },
          {
            id: 'new_emp',
            label: 'Registrar Empleado',
            description: 'Asignar usuario a su bodega y rol operativo',
            icon: userIcon,
            onClick: () => handleNavigate('thirdParties', 'employees'),
          },
        ]
      case 'reports':
        return [
          {
            id: 'recycle',
            label: 'Papelera de Reciclaje',
            description: 'Consultar y restaurar registros eliminados',
            icon: fileTextIcon,
            onClick: () => handleNavigate('reports', 'recycleBin'),
          },
        ]
      default:
        return []
    }
  }

  const actions = getActions()
  const moduleTitle = MODULE_HEADER_TITLES[activeModule] || 'Gestión'

  return (
    <div className="contextual-actions-drawer">
      <div className="contextual-actions-intro">
        <p className="contextual-actions-label">Acciones rápidas para ({activeSubitem}):</p>
        <h4 className="contextual-actions-title">{moduleTitle}</h4>
      </div>

      <div className="contextual-actions-list">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className="contextual-action-card"
            onClick={act.onClick}
          >
            <div className="contextual-action-icon-wrap">
              <img src={act.icon} alt="" className="contextual-action-icon" />
            </div>
            <div className="contextual-action-info">
              <span className="contextual-action-name">{act.label}</span>
              <span className="contextual-action-desc">{act.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
