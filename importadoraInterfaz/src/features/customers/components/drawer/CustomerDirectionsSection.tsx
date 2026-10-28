// CustomerDirectionsSection · direcciones del cliente: lista, botón de borrar y formulario para agregar una nueva
// conecta con: customers.selectors (direcciones y estado), customers.details.thunks (agregar), customers.constants (formulario vacío); el borrado lo confirma CustomerDrawer
// ojo: el formulario es local (no va al estado global); dirección y ciudad son obligatorias; mientras el backend guarda se bloquean los botones
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation.helpers'
import { EMPTY_DIRECTION_INPUT } from '../../constants/customers.constants'
import { selectCustomerDirections } from '../../selectors/customers.selectors'
import { addDirectionThunk } from '../../thunks/customers.details.thunks'
import type { DirectionInput } from '../../types/customers.types'

interface Props {
  customerId: number
  onRequestDelete: (directionId: number) => void
}

const FIELDS: { key: keyof DirectionInput; label: string; required?: boolean }[] = [
  { key: 'address', label: 'Dirección', required: true },
  { key: 'neighborhood', label: 'Barrio' },
  { key: 'city', label: 'Ciudad', required: true },
  { key: 'department', label: 'Departamento' },
  { key: 'country', label: 'País' },
  { key: 'additionalInfo', label: 'Indicaciones' },
]

export const CustomerDirectionsSection: React.FC<Props> = ({ customerId, onRequestDelete }) => {
  const dispatch = useAppDispatch()
  const directions = useAppSelector(selectCustomerDirections)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<DirectionInput>(EMPTY_DIRECTION_INPUT)

  const canSubmit = form.address.trim() !== '' && form.city.trim() !== '' && !directions.saving

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    const result = await dispatch(addDirectionThunk({ customerId, input: form }))
    if (addDirectionThunk.fulfilled.match(result)) {
      setForm(EMPTY_DIRECTION_INPUT)
      setIsFormOpen(false)
    }
  }

  return (
    <section className="customer-drawer-section">
      <div className="customer-drawer-section-head">
        <h3 className="customer-drawer-section-title">Direcciones</h3>
        <button type="button" className="customer-drawer-link-btn" onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {isFormOpen && (
        <form className="customer-drawer-form" onSubmit={handleSubmit}>
          {FIELDS.map((field) => (
            <ValidatedInput
              key={field.key}
              id={`dir-${field.key}`}
              label={field.label}
              value={form[field.key]}
              onChange={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              required={field.required}
            />
          ))}
          <button type="submit" className="customer-drawer-primary-btn" disabled={!canSubmit}>
            Guardar dirección
          </button>
        </form>
      )}

      {directions.status === 'failed' && <p className="customer-drawer-note customer-drawer-note-error">{directions.error}</p>}
      {directions.status !== 'failed' && directions.items.length === 0 && (
        <p className="customer-drawer-note">{directions.status === 'succeeded' ? 'Este cliente no tiene direcciones.' : 'Cargando direcciones…'}</p>
      )}

      <ul className="customer-drawer-list">
        {directions.items.map((direction) => (
          <li key={direction.id} className="customer-drawer-list-item">
            <div className="customer-drawer-list-text">
              <span className="customer-drawer-list-main">{direction.address}</span>
              <span className="customer-drawer-list-sub">
                {[direction.neighborhood, direction.city, direction.department].filter(Boolean).join(' · ')}
              </span>
              {direction.additionalInfo && <span className="customer-drawer-list-sub">{direction.additionalInfo}</span>}
            </div>
            <button
              type="button"
              className="customer-drawer-remove-btn"
              onClick={() => onRequestDelete(direction.id)}
              disabled={directions.saving}
              aria-label={`Borrar la dirección ${direction.address}`}
              title="Borrar dirección"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default CustomerDirectionsSection
