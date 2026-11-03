// permissions.selection.test · pruebas de la selección visual de permisos: pantallas, módulos, todas/ninguna y permisos finos
// conecta con: permissions.selection; se corre con npm test
import { describe, expect, it } from 'vitest'
import type { NavItem } from '@/features/navigation'
import {
  countScreens,
  emptyModule,
  isModuleFull,
  isScreenOn,
  setAllModules,
  summarizePermissions,
  toggleModule,
  toggleScreen,
  toggleScreenFlag,
} from './permissions.selection'

const shop = { id: 'shop', label: 'Tienda', icon: '', subitems: [{ id: 'catalog', label: 'Catálogo' }, { id: 'orders', label: 'Pedidos' }] } as NavItem
const wallet = { id: 'wallet', label: 'Cartera', icon: '', subitems: [{ id: 'credit', label: 'Créditos' }] } as NavItem

describe('toggleScreen', () => {
  it('activar una pantalla le da acceso completo y el módulo queda con ver, crear, editar y anular', () => {
    const next = toggleScreen(emptyModule(shop), 'catalog')
    expect(isScreenOn(next, 'catalog')).toBe(true)
    expect(next.screens.find((s) => s.screenKey === 'catalog')).toMatchObject({ canRead: true, canCreate: true, canUpdate: true, canDelete: true })
    expect(next).toMatchObject({ canRead: true, canDelete: true })
    expect(isScreenOn(next, 'orders')).toBe(false)
  })

  it('al apagar la única pantalla activa el módulo queda sin permisos', () => {
    const off = toggleScreen(toggleScreen(emptyModule(shop), 'catalog'), 'catalog')
    expect(off).toMatchObject({ canRead: false, canCreate: false, canUpdate: false, canDelete: false })
  })
})

describe('toggleScreenFlag', () => {
  it('quitar «anular» deja ver, crear y editar', () => {
    const next = toggleScreenFlag(toggleScreen(emptyModule(shop), 'catalog'), 'catalog', 'canDelete')
    expect(next.screens.find((s) => s.screenKey === 'catalog')).toMatchObject({ canRead: true, canCreate: true, canUpdate: true, canDelete: false })
  })

  it('quitar «ver» apaga todos los permisos de la pantalla', () => {
    const next = toggleScreenFlag(toggleScreen(emptyModule(shop), 'catalog'), 'catalog', 'canRead')
    expect(next.screens.find((s) => s.screenKey === 'catalog')).toMatchObject({ canRead: false, canCreate: false, canUpdate: false, canDelete: false })
  })

  it('activar «crear» en una pantalla apagada la deja visible', () => {
    const next = toggleScreenFlag(emptyModule(shop), 'orders', 'canCreate')
    expect(next.screens.find((s) => s.screenKey === 'orders')).toMatchObject({ canRead: true, canCreate: true, canUpdate: false })
  })
})

describe('módulos', () => {
  it('toggleModule activa todas las pantallas y, si ya estaba completo, las apaga', () => {
    const full = toggleModule(emptyModule(shop), shop)
    expect(isModuleFull(full, shop)).toBe(true)
    const none = toggleModule(full, shop)
    expect(none.screens.every((s) => !s.canRead)).toBe(true)
  })

  it('setAllModules y countScreens: todas / ninguna y el conteo «N de M»', () => {
    const items = [shop, wallet]
    const all = setAllModules({}, items, true)
    expect(countScreens(all, items)).toEqual({ selected: 3, total: 3 })
    const none = setAllModules(all, items, false)
    expect(countScreens(none, items)).toEqual({ selected: 0, total: 3 })
  })
})

describe('summarizePermissions', () => {
  it('lista solo los módulos y pantallas con acceso, con sus acciones', () => {
    let map = setAllModules({}, [shop, wallet], false)
    map = { ...map, shop: toggleScreenFlag(toggleScreen(map.shop, 'catalog'), 'catalog', 'canDelete') }
    expect(summarizePermissions(map, [shop, wallet])).toEqual([
      { module: 'Tienda', screens: [{ screen: 'Catálogo', actions: ['Ver', 'Crear', 'Editar'] }] },
    ])
  })

  it('sin permisos la lista queda vacía', () => {
    expect(summarizePermissions(setAllModules({}, [shop, wallet], false), [shop, wallet])).toEqual([])
  })
})
