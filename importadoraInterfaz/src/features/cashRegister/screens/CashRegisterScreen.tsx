// CashRegisterScreen · Tienda > Caja: el turno de caja de la bodega (aviso de apertura) y, en la barra de pedidos, las acciones de caja
// conecta con: useCashSession (turno), CashShiftSlider, CashClosedBanner, CashOrdersPanel (pedidos, toolbar y cobro) y navigation (abrir el abono a cartera o registrar gasto)
// ojo: las alertas de error se delegan a toast flotantes; las acciones de caja se ubican a nivel de orders-toolbar-tools
import React, { useEffect } from 'react'
import './CashRegisterScreen.css'
import { openDrawerForm, setActiveWarehouse } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import { toast } from '@/global/helpers/feedback/toast'
import { CashOrdersPanel } from '../components/orders/CashOrdersPanel'
import { CashClosedBanner } from '../components/shift/CashClosedBanner'
import { CashShiftSlider } from '../components/shift/CashShiftSlider'
import { useCashSession } from '../hooks/useCashSession'

export const CashRegisterScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const cash = useCashSession()
  const warehouses = useAppSelector(selectWarehouses)

  useEffect(() => {
    if (cash.warehouseId <= 0 && warehouses.length > 0) {
      dispatch(setActiveWarehouse({ id: warehouses[0].id, name: warehouses[0].name }))
    }
  }, [cash.warehouseId, warehouses, dispatch])

  useEffect(() => {
    if (cash.failed && cash.error) {
      toast.error(cash.error)
    }
  }, [cash.failed, cash.error])

  return (
    <div className="cash-mgmt-screen">
      {!cash.loading && !cash.failed && !cash.isOpen && cash.warehouseId > 0 && (
        <CashClosedBanner warehouseName={cash.warehouseName} onOpen={cash.requestOpen} />
      )}

      <CashOrdersPanel
        shiftActions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch(openDrawerForm({ kind: 'registerExpense' }))}
              title="Registrar fletes, nómina, aseo u otros gastos menores"
            >
              Registrar Gasto
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch(openDrawerForm({ kind: 'createAbono', payload: { onDone: cash.reload } }))}
              title="Registrar el abono de un cliente a su crédito"
            >
              Registrar abono
            </button>
            <CashShiftSlider
              isOpen={cash.isOpen}
              loading={cash.loading || cash.saving}
              disabled={cash.warehouseId <= 0}
              disabledReason="Elige una bodega para gestionar su turno de caja"
              onRequestOpen={cash.requestOpen}
              onRequestClose={cash.requestClose}
            />
          </>
        }
      />
    </div>
  )
}

export default CashRegisterScreen
