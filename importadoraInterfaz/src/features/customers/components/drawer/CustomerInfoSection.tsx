// CustomerInfoSection · datos del cliente en el panel: documento, correo, nivel de precio, comisión y datos de la empresa
// conecta con: CustomerDrawer (le pasa el estado del detalle); los datos vienen de GET /users/{id} (customers.selectors → selectCustomerDetail)
// ojo: solo se muestran los datos que vienen con valor; mientras carga o si falla se avisa en el mismo lugar
import React from 'react'
import type { CustomerDetailState } from '../../types/customers.types'

interface InfoRow {
  label: string
  value: string | number | undefined
}

export const CustomerInfoSection: React.FC<{ detail: CustomerDetailState }> = ({ detail }) => {
  if (detail.status === 'failed') return <p className="customer-drawer-note customer-drawer-note-error">{detail.error}</p>
  if (!detail.data) return <p className="customer-drawer-note">Cargando datos del cliente…</p>

  const { data } = detail
  const { company } = data
  const rows: InfoRow[] = [
    { label: 'Documento', value: data.identification },
    { label: 'Correo', value: data.email },
    { label: 'Tipo de usuario', value: data.userType },
    { label: 'Nivel de precio', value: data.priceType },
    { label: 'Comisión', value: data.commissionRate ? `${data.commissionRate} %` : undefined },
    { label: 'Razón social', value: company.businessName || company.corporateName },
    { label: 'Nombre comercial', value: company.tradeName },
    { label: 'NIT', value: company.nit },
    { label: 'Representante legal', value: company.legalRepresentative },
    { label: 'Régimen', value: company.regimeType },
    { label: 'Teléfono', value: company.phone },
    { label: 'Celular', value: company.cellPhone },
    { label: 'Ciudad y departamento', value: company.cityAndDepartment },
    { label: 'Dirección fiscal', value: company.address },
    { label: 'Correo de facturación', value: company.mailInvoicing },
  ].filter((row) => row.value !== undefined && row.value !== '')

  return (
    <section className="customer-drawer-section">
      <h3 className="customer-drawer-section-title">Datos del cliente</h3>
      <dl className="customer-drawer-info">
        {rows.map((row) => (
          <div key={row.label} className="customer-drawer-info-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default CustomerInfoSection
