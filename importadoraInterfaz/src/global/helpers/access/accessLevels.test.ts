// accessLevels.test · pruebas del nivel de cada usuario y de qué niveles ven cada componente
// conecta con: accessLevels; se corre con npm test
import { describe, expect, it } from 'vitest'
import { canLevelSee, getActorLevel, labelForLevel, levelAllows } from './accessLevels'

describe('getActorLevel', () => {
  it('reconoce superadmin, admin y empleado; lo demás es cliente', () => {
    expect(getActorLevel('superadmin')).toBe('superadmin')
    expect(getActorLevel('admin')).toBe('admin')
    expect(getActorLevel('employee')).toBe('employee')
    expect(getActorLevel('seller')).toBe('customer')
    expect(getActorLevel(undefined)).toBe('customer')
  })
})

describe('canLevelSee', () => {
  it('la configuración la ve todo el personal (la matriz decide qué), no el cliente', () => {
    expect(canLevelSee('admin', 'settings')).toBe(true)
    expect(canLevelSee('superadmin', 'settings')).toBe(true)
    expect(canLevelSee('employee', 'settings')).toBe(true)
    expect(canLevelSee('customer', 'settings')).toBe(false)
  })

  it('auditoría, sedes y roles pueden verlos los empleados (si tienen el permiso) y el cliente no', () => {
    expect(canLevelSee('employee', 'reports', 'audit')).toBe(true)
    expect(canLevelSee('customer', 'reports', 'audit')).toBe(false)
    expect(canLevelSee('employee', 'settings', 'warehouses')).toBe(true)
    expect(canLevelSee('admin', 'settings', 'rolesPermissions')).toBe(true)
  })

  it('el salto de compañía es solo del superadmin', () => {
    expect(levelAllows('superadmin', 'companySwitch')).toBe(true)
    expect(levelAllows('admin', 'companySwitch')).toBe(false)
  })

  it('una pantalla sin regla la ven todos los niveles', () => {
    expect(canLevelSee('employee', 'shop', 'catalog')).toBe(true)
    expect(canLevelSee('customer', 'shop', 'catalog')).toBe(true)
  })
})

describe('labelForLevel', () => {
  it('el superadmin ve «Compañías» donde el administrador ve «Sedes»', () => {
    expect(labelForLevel('superadmin', 'settings', 'warehouses', 'Sedes')).toBe('Compañías')
    expect(labelForLevel('admin', 'settings', 'warehouses', 'Sedes')).toBe('Sedes')
    expect(labelForLevel('superadmin', 'shop', 'catalog', 'Catálogo')).toBe('Catálogo')
  })
})
