// CustomerStep · primer paso: elegir el cliente (búsqueda), confirmar o editar los datos de entrega que se cargan de la base y, si lo hace un administrador, elegir el empleado al que se le entrega la venta
// conecta con: CheckoutPanel (lo usa), useCheckoutFlow (estado), useEmployeesDirectory (empleados), ValidatedInput y CheckoutPanel.css
// ojo: las cotizaciones solo piden el cliente (sin entrega ni empleado); la entrega pide dirección, ciudad y teléfono de 10 dígitos
import React from 'react'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation/validation.helpers'
import { useEmployeesDirectory } from '@/features/employees'
import type { useCheckoutFlow } from '../hooks/useCheckoutFlow'

type Flow = ReturnType<typeof useCheckoutFlow>

export const CustomerStep: React.FC<{ flow: Flow }> = ({ flow }) => {
  const { employees } = useEmployeesDirectory()
  const { customer, delivery, setDelivery } = flow

  return (
    <div className="checkout-section">
      <h4 className="checkout-title">1. Cliente</h4>
      {customer ? (
        <div className="checkout-customer">
          <div>
            <strong>{customer.name}</strong>
            <small>{customer.document}{customer.discountPercent > 0 && ` · descuento ${customer.discountPercent} %`}</small>
          </div>
          <button type="button" className="btn-secondary" onClick={flow.clearCustomer}>Cambiar</button>
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

          <ValidatedInput id="co-address" label="Dirección" value={delivery.address} onChange={(address) => setDelivery({ ...delivery, address })} sanitize={SANITIZERS.trim} maxLength={120} required />
          <ValidatedInput id="co-city" label="Ciudad" value={delivery.city} onChange={(city) => setDelivery({ ...delivery, city })} sanitize={SANITIZERS.trim} maxLength={60} required />
          <ValidatedInput id="co-phone" label="Teléfono de contacto" value={delivery.phone} onChange={(phone) => setDelivery({ ...delivery, phone })} sanitize={SANITIZERS.numericOnly} maxLength={10} required error={delivery.phone && delivery.phone.length !== 10 ? 'Debe tener 10 dígitos' : undefined} />
          <ValidatedInput id="co-notes" label="Indicaciones (opcional)" value={delivery.notes} onChange={(notes) => setDelivery({ ...delivery, notes })} maxLength={120} />
        </>
      )}

      {flow.needsEmployee && (
        <>
          <h4 className="checkout-title">3. Empleado que recibe la venta</h4>
          <p className="checkout-hint">El administrador no vende por sí mismo: la venta queda a nombre del empleado que elijas.</p>
          <select
            className="checkout-select"
            value={flow.employeeId}
            onChange={(e) => flow.setEmployeeId(Number(e.target.value))}
            style={flow.employeeId <= 0 ? { borderColor: 'var(--c-amber-500, #f59e0b)', backgroundColor: 'var(--c-amber-50, #fffbeb)' } : undefined}
          >
            <option value={0}>Selecciona un vendedor responsable...</option>
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.name}</option>
            ))}
          </select>
          {flow.employeeId <= 0 && (
            <span style={{ fontSize: '11.5px', color: 'var(--c-amber-700, #b45309)', marginTop: '2px', display: 'block' }}>
              ⚠️ Campo obligatorio para administradores antes de continuar al pago.
            </span>
          )}
        </>
      )}
    </div>
  )
}

export default CustomerStep
