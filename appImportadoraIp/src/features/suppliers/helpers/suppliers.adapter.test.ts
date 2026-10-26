// suppliers.adapter.test · pruebas de la conversión de proveedores y totales del backend
// conecta con: suppliers.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toSupplier, toSuppliersSummary } from './suppliers.adapter'

describe('toSupplier', () => {
  const dto = {
    supplierId: 19,
    name: 'Lubricantes SAS',
    documentType: 'NIT',
    documentId: '900123',
    contactName: 'H MOTOS',
    contactPhone: '3340000',
    contactEmail: 'h@motos.co',
    city: 'Medellín',
    paymentTerms: 30,
    creditLimit: 5000000,
    isActive: true,
    createdAt: '2026-03-10 09:47:29',
  }

  it('arma nombre, documento, contacto, plazo, cupo y fecha', () => {
    expect(toSupplier(dto)).toEqual({
      id: 19,
      name: 'Lubricantes SAS',
      document: 'NIT 900123',
      contactName: 'H MOTOS',
      contactPhone: '3340000',
      contactEmail: 'h@motos.co',
      city: 'Medellín',
      paymentTerms: 30,
      creditLimit: 5000000,
      isActive: true,
      createdAt: '2026-03-10',
    })
  })

  it('si el nombre llega vacío usa el del contacto, luego el documento y luego el número', () => {
    expect(toSupplier({ ...dto, name: '' }).name).toBe('H MOTOS')
    expect(toSupplier({ ...dto, name: '', contactName: '' }).name).toBe('900123')
    expect(toSupplier({ supplierId: 5 }).name).toBe('Proveedor 5')
  })

  it('si no hay contacto usa el teléfono y el correo del proveedor', () => {
    expect(toSupplier({ supplierId: 1, phone: '311', email: 'a@b.co' })).toMatchObject({ contactPhone: '311', contactEmail: 'a@b.co' })
  })

  it('campos que faltan quedan vacíos o en 0, y activo salvo que diga false', () => {
    expect(toSupplier({ supplierId: 2 })).toMatchObject({ paymentTerms: 0, creditLimit: 0, isActive: true, createdAt: '' })
    expect(toSupplier({ supplierId: 3, isActive: false }).isActive).toBe(false)
  })
})

describe('toSuppliersSummary', () => {
  it('convierte los totales y deja en 0 lo que falta', () => {
    expect(toSuppliersSummary({ totalSuppliers: 26, activeSuppliers: 20 })).toEqual({ total: 26, active: 20, products: 0, totalCreditLimit: 0 })
  })
})
