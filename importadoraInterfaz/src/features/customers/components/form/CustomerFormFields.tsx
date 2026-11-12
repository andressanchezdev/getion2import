// CustomerFormFields · campos compartidos entre CreateCustomerForm y EditCustomerForm organizados por secciones
import React from 'react'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation/validation.helpers'
import { Pill } from '@/global/components/UI/atoms/Pill'

export interface CustomerFormValues {
  documentType: string
  document: string
  personType: 'natural' | 'legal'
  name: string
  lastName: string
  tradeName: string
  legalRepresentative: string
  phone: string
  mobile: string
  email: string
  city: string
  address: string
  vatResponsible: boolean
  fiscalRespCodes: string[]
  priceTier: string
  discountPercent: number
  docsValidityMonths: number
}

interface CustomerFormFieldsProps {
  values: CustomerFormValues
  onChange: <K extends keyof CustomerFormValues>(field: K, value: CustomerFormValues[K]) => void
  errors?: Partial<Record<keyof CustomerFormValues, string>>
  disabled?: boolean
  isEdit?: boolean
  docAsyncError?: string | null
  emailAsyncError?: string | null
  onDocChange?: (doc: string) => void
  onEmailChange?: (email: string) => void
}

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'NIT', label: 'Número de Identificación Tributaria (NIT)' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PA', label: 'Pasaporte (PA)' },
]

const PRICE_TIERS = [
  { value: 'p1', label: 'P1 · Precio Estándar / Mostrador' },
  { value: 'p2', label: 'P2 · Precio Taller / Mecánico' },
  { value: 'p3', label: 'P3 · Precio Mayorista Pequeño' },
  { value: 'p4', label: 'P4 · Precio Distribuidor / Gran Mayorista' },
]

export const CustomerFormFields: React.FC<CustomerFormFieldsProps> = ({
  values,
  onChange,
  errors = {},
  disabled = false,
  isEdit = false,
  docAsyncError,
  emailAsyncError,
  onDocChange,
  onEmailChange,
}) => {
  const isLegal = values.personType === 'legal'

  const handleDoc = (val: string) => {
    onChange('document', val)
    onDocChange?.(val)
  }

  const handleEmail = (val: string) => {
    onChange('email', val)
    onEmailChange?.(val)
  }

  return (
    <div className="customer-form-fields-container">
      {/* 1. SECCIÓN: Tipo de Persona */}
      <div className="drawer-form-section">
        <h4 className="drawer-form-section-title">1. Tipo de Cliente</h4>
        <div className="drawer-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <label className={`radio-card ${!isLegal ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="personType"
              value="natural"
              checked={!isLegal}
              disabled={disabled}
              onChange={() => onChange('personType', 'natural')}
            />
            <span className="radio-card-content">
              <strong>Persona Natural</strong>
              <small>Cédula de ciudadanía o extranjería</small>
            </span>
          </label>
          <label className={`radio-card ${isLegal ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="personType"
              value="legal"
              checked={isLegal}
              disabled={disabled}
              onChange={() => onChange('personType', 'legal')}
            />
            <span className="radio-card-content">
              <strong>Persona Jurídica</strong>
              <small>Empresas con NIT y razón social</small>
            </span>
          </label>
        </div>
      </div>

      {/* 2. SECCIÓN: Identificación y Nombres */}
      <div className="drawer-form-section">
        <h4 className="drawer-form-section-title">2. Identificación y Nombres</h4>
        <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="drawer-form-field">
            <label htmlFor="cust-doc-type" className="drawer-form-label">Tipo de Documento</label>
            <select
              id="cust-doc-type"
              className="drawer-form-control"
              value={values.documentType}
              disabled={disabled || isEdit}
              onChange={(e) => onChange('documentType', e.target.value)}
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            {isEdit && <small className="drawer-form-hint">El documento identifica al cliente en facturas históricas y no se modifica.</small>}
          </div>

          <ValidatedInput
            id="cust-doc"
            label="Número de Documento"
            value={values.document}
            onChange={handleDoc}
            sanitize={SANITIZERS.numericOnly}
            maxLength={15}
            required
            disabled={disabled || isEdit}
            error={errors.document || (docAsyncError ?? undefined)}
            placeholder="Ej: 10203040"
          />
        </div>

        <div className="drawer-form-grid" style={{ gridTemplateColumns: isLegal ? '1fr' : '1fr 1fr' }}>
          <ValidatedInput
            id="cust-name"
            label={isLegal ? 'Razón Social' : 'Nombres'}
            value={values.name}
            onChange={(val) => onChange('name', val)}
            sanitize={SANITIZERS.trim}
            maxLength={60}
            required
            disabled={disabled}
            error={errors.name}
            placeholder={isLegal ? 'Ej: Inversiones y Repuestos S.A.S.' : 'Ej: Carlos Alberto'}
          />
          {!isLegal && (
            <ValidatedInput
              id="cust-lastname"
              label="Apellidos"
              value={values.lastName}
              onChange={(val) => onChange('lastName', val)}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              disabled={disabled}
              placeholder="Ej: Gómez Pérez"
            />
          )}
        </div>

        {isLegal && (
          <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <ValidatedInput
              id="cust-tradename"
              label="Nombre Comercial (Opcional)"
              value={values.tradeName}
              onChange={(val) => onChange('tradeName', val)}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              disabled={disabled}
              placeholder="Ej: Repuestos El Motor"
            />
            <ValidatedInput
              id="cust-legalrep"
              label="Representante Legal (Opcional)"
              value={values.legalRepresentative}
              onChange={(val) => onChange('legalRepresentative', val)}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              disabled={disabled}
              placeholder="Ej: Juan Pérez"
            />
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: Contacto y Ubicación */}
      <div className="drawer-form-section">
        <h4 className="drawer-form-section-title">3. Contacto y Ubicación</h4>
        <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <ValidatedInput
            id="cust-phone"
            label="Teléfono Principal"
            value={values.phone}
            onChange={(val) => onChange('phone', val)}
            sanitize={SANITIZERS.numericOnly}
            maxLength={10}
            disabled={disabled}
            error={errors.phone}
            placeholder="Ej: 6012345678"
          />
          <ValidatedInput
            id="cust-mobile"
            label="Celular"
            value={values.mobile}
            onChange={(val) => onChange('mobile', val)}
            sanitize={SANITIZERS.numericOnly}
            maxLength={10}
            disabled={disabled}
            placeholder="Ej: 3001234567"
          />
        </div>

        <ValidatedInput
          id="cust-email"
          label="Correo Electrónico (Facturación y Notificaciones)"
          value={values.email}
          onChange={handleEmail}
          sanitize={SANITIZERS.trim}
          maxLength={80}
          disabled={disabled}
          error={errors.email || (emailAsyncError ?? undefined)}
          placeholder="Ej: cliente@empresa.com"
        />

        <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <ValidatedInput
            id="cust-city"
            label="Ciudad / Municipio"
            value={values.city}
            onChange={(val) => onChange('city', val)}
            sanitize={SANITIZERS.trim}
            maxLength={50}
            disabled={disabled}
            placeholder="Ej: Medellín"
          />
          <ValidatedInput
            id="cust-address"
            label="Dirección Principal"
            value={values.address}
            onChange={(val) => onChange('address', val)}
            sanitize={SANITIZERS.trim}
            maxLength={120}
            disabled={disabled}
            placeholder="Ej: Calle 50 # 40-20"
          />
        </div>
      </div>

      {/* 4. SECCIÓN: Fiscal y Comercial */}
      <div className="drawer-form-section">
        <h4 className="drawer-form-section-title">4. Parámetros Comerciales y Fiscales</h4>
        <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="drawer-form-field">
            <label htmlFor="cust-tier" className="drawer-form-label">Nivel de Precio Asignado</label>
            <select
              id="cust-tier"
              className="drawer-form-control"
              value={values.priceTier}
              disabled={disabled}
              onChange={(e) => onChange('priceTier', e.target.value)}
            >
              {PRICE_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>{tier.label}</option>
              ))}
            </select>
          </div>

          <ValidatedInput
            id="cust-discount"
            label="Descuento Comercial (%)"
            value={String(values.discountPercent || '')}
            onChange={(val) => onChange('discountPercent', Number(val) || 0)}
            sanitize={SANITIZERS.numericOnly}
            maxLength={3}
            disabled={disabled}
            placeholder="0"
          />
        </div>

        <div className="drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="drawer-form-field">
            <label htmlFor="cust-vat" className="drawer-form-label">Responsabilidad de IVA</label>
            <select
              id="cust-vat"
              className="drawer-form-control"
              value={values.vatResponsible ? 'yes' : 'no'}
              disabled={disabled}
              onChange={(e) => onChange('vatResponsible', e.target.value === 'yes')}
            >
              <option value="no">No responsable de IVA</option>
              <option value="yes">Responsable de IVA (Común)</option>
            </select>
          </div>

          <ValidatedInput
            id="cust-validity"
            label="Vigencia Documentos (Meses)"
            value={String(values.docsValidityMonths || 12)}
            onChange={(val) => onChange('docsValidityMonths', Number(val) || 12)}
            sanitize={SANITIZERS.numericOnly}
            maxLength={2}
            disabled={disabled}
            placeholder="12"
          />
        </div>

        <div className="drawer-form-info-card" style={{ marginTop: 'var(--space-2)' }}>
          <Pill tone="blue">Información de Crédito</Pill>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            La habilitación de crédito, cupo máximo asignado y días de plazo se administran de forma segura desde el módulo de <strong>Cartera &gt; Habilitar Crédito</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

