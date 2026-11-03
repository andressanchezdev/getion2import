// navigation.route.test · pruebas de la ruta del navegador por pantalla: se arma desde módulo y subgestión y se lee de vuelta
// conecta con: navigation.helpers (toRoutePath, parseRoutePath); se corre con npm test
import { describe, expect, it } from 'vitest'
import { parseRoutePath, toRoutePath } from './navigation.helpers'

describe('toRoutePath', () => {
  it('arma /módulo/subgestión', () => {
    expect(toRoutePath('shop', 'orders')).toBe('/shop/orders')
  })
})

describe('parseRoutePath', () => {
  it('lee una ruta válida', () => {
    expect(parseRoutePath('/thirdParties/customers')).toEqual({ module: 'thirdParties', subitem: 'customers' })
  })

  it('con solo el módulo abre su primera subgestión', () => {
    expect(parseRoutePath('/shop')).toEqual({ module: 'shop', subitem: 'catalog' })
  })

  it('una subgestión que no existe en el módulo no es válida', () => {
    expect(parseRoutePath('/shop/nada')).toBeNull()
  })

  it('la raíz y los módulos desconocidos no son pantallas', () => {
    expect(parseRoutePath('/')).toBeNull()
    expect(parseRoutePath('/login')).toBeNull()
  })

  it('configuración tiene sus subgestiones: roles y permisos y sedes', () => {
    expect(parseRoutePath('/settings/rolesPermissions')).toEqual({ module: 'settings', subitem: 'rolesPermissions' })
    expect(parseRoutePath('/settings')).toEqual({ module: 'settings', subitem: 'company' })
  })
})
