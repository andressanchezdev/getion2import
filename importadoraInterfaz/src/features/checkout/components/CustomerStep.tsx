// CustomerStep · primer paso: elegir el cliente (búsqueda), confirmar o editar los datos de entrega que se cargan de la base y, si lo hace un administrador, elegir el empleado al que se le entrega la venta
// conecta con: CheckoutPanel (lo usa), useCheckoutFlow (estado), useEmployeesDirectory (empleados), ValidatedInput y CheckoutPanel.css
// ojo: las cotizaciones solo piden el cliente (sin entrega ni empleado); la entrega pide dirección, ciudad y teléfono de 10 dígitos
import { Icon } from '@/global/components/UI/atoms/Icon'
import swapIcon from '@/assets/icons/swap.svg?raw'
import React, { useState } from 'react'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation/validation.helpers'
import { useEmployeesDirectory } from '@/features/employees'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toWarehouseNumber } from '@/features/shop'
import { setActiveWarehouse } from '@/features/navigation'
import { useWarehouses } from '@/features/warehouses'
import type { useCheckoutFlow } from '../hooks/useCheckoutFlow'

type Flow = ReturnType<typeof useCheckoutFlow>

export const CustomerStep: React.FC<{ flow: Flow }> = ({ flow }) => {
  const dispatch = useAppDispatch()
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
  const warehouseNum = toWarehouseNumber(activeWarehouseId)
  const { warehouses } = useWarehouses()

  // Solo se cargan los empleados de la bodega activa
  const { employees, loading: loadingEmployees } = useEmployeesDirectory(warehouseNum)
  const { customer, delivery, setDelivery } = flow
  // un campo se marca como incompleto cuando ya se tocó o cuando se intentó continuar con algo pendiente
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }))
  const problem = (field: 'address' | 'city' | 'phone') => (touched[field] || flow.attempted ? flow.problems[field] : undefined)

  return (
    <div className="checkout-section">
      <h4 className="checkout-title">1. Cliente</h4>
      {customer ? (
        <div className="checkout-customer">
          <div>
            <strong>{customer.name}</strong>
            <small>{customer.document}{customer.discountPercent > 0 && ` · descuento ${customer.discountPercent} %`}</small>
          </div>
          <button type="button" className="btn-secondary" onClick={flow.clearCustomer}><Icon svg={swapIcon} /> Cambiar</button>
        </div>
      ) : (
        <>
          <input className="checkout-search" type="text" maxLength={60} placeholder="Buscar cliente por nombre, documento o correo..." value={flow.query} onChange={(e) => flow.setQuery(e.target.value)} />
          <ul className="checkout-results">
            {flow.results.map((result) => (
              <li key={result.id}>
                <button type="button" onClick={() => flow.chooseCustomer(result.id)}>
                  <strong>{result.name}</strong>
                  <small>{result.document}</small>
                </button>
              </li>
            ))}
            {flow.query.trim().length >= 2 && flow.results.length === 0 && <li className="checkout-empty">Sin resultados. Registra el cliente en Terceros, Clientes.</li>}
          </ul>
        </>
      )}

      {customer && !flow.isQuotation && (
        <>
          <h4 className="checkout-title">2. Datos de entrega</h4>
          <p className="checkout-hint">
            {delivery.address ? 'Se cargaron automáticamente los datos registrados del cliente.' : 'Ingresa la dirección donde el cliente recibirá el pedido.'}
          </p>

          {customer.deliveries.length > 1 && (
            <div className="checkout-saved">
              <span className="checkout-field-label">
                Direcciones guardadas del cliente:
              </span>
              <div className="checkout-field-row">
                {customer.deliveries.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn-secondary checkout-btn-compact"
                    onClick={() => setDelivery(d)}
                  >
                    {d.address} ({d.city})
                  </button>
                ))}
              </div>
            </div>
          )}

          <ValidatedInput id="co-address" label="Dirección" value={delivery.address} onChange={(address) => setDelivery({ ...delivery, address })} sanitize={SANITIZERS.trim} maxLength={120} required onBlur={() => touch('address')} error={problem('address')} />
          <ValidatedInput id="co-city" label="Ciudad" value={delivery.city} onChange={(city) => setDelivery({ ...delivery, city })} sanitize={SANITIZERS.trim} maxLength={60} required onBlur={() => touch('city')} error={problem('city')} />
          <ValidatedInput id="co-phone" label="Teléfono de contacto" value={delivery.phone} onChange={(phone) => setDelivery({ ...delivery, phone })} sanitize={SANITIZERS.numericOnly} maxLength={10} required onBlur={() => touch('phone')} error={problem('phone')} />
          <ValidatedInput id="co-notes" label="Indicaciones (opcional)" value={delivery.notes} onChange={(notes) => setDelivery({ ...delivery, notes })} maxLength={120} />
        </>
      )}

      {flow.needsEmployee && (
        <>
          <h4 className="checkout-title">3. Empleado que recibe la venta</h4>
          {!warehouseNum ? (
            <div className="checkout-warehouse-alert" style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <strong style={{ display: 'block', color: '#d48806', marginBottom: '4px' }}>
                ⚠️ Bodega no seleccionada
              </strong>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#595959' }}>
                Estás en &laquo;{activeWarehouseName || 'Todas las bodegas'}&raquo;. La venta debe asociarse al inventario de una bodega específica:
              </p>
              <select
                className="checkout-select"
                defaultValue=""
                onChange={(e) => {
                  const found = warehouses.find((w) => w.id === e.target.value)
                  if (found) {
                    dispatch(setActiveWarehouse(found))
                    flow.setEmployeeId(0)
                  }
                }}
              >
                <option value="" disabled>Selecciona una bodega para la venta...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name} (#{wh.id})</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <p className="checkout-hint">
                Asignando a vendedor de <strong>{activeWarehouseName}</strong>. El administrador no vende por sí mismo: la venta queda a nombre del vendedor que elijas.
              </p>
              <select
                className={`checkout-select ${flow.attempted && flow.employeeId <= 0 ? 'form-input-error' : ''}`}
                value={flow.employeeId}
                onChange={(e) => flow.setEmployeeId(Number(e.target.value))}
                disabled={loadingEmployees}
              >
                <option value={0}>
                  {loadingEmployees ? 'Cargando vendedores de la bodega...' : employees.length === 0 ? 'No hay vendedores en esta bodega' : 'Selecciona un vendedor responsable...'}
                </option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>{emp.name} {emp.lastName || ''}</option>
                ))}
              </select>
              {flow.attempted && flow.employeeId <= 0 && <span className="form-field-error-msg" role="alert">Elige el empleado al que se asigna la venta.</span>}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default CustomerStep
