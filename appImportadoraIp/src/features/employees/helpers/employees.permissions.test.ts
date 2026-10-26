// employees.permissions.test · pruebas de la matriz de permisos: lo que el servidor no trae queda en solo lectura
// conecta con: employees.permissions y MENU_ITEMS (navigation); se corre con npm test
import { describe, expect, it } from 'vitest'
import { MENU_ITEMS } from '@/features/navigation'
import { buildModulesMap } from './employees.permissions'

describe('buildModulesMap', () => {
  it('sin módulos del servidor todo queda en solo lectura (nunca crear, editar ni anular)', () => {
    const map = buildModulesMap([])
    expect(Object.keys(map)).toEqual(MENU_ITEMS.map((item) => item.id))
    for (const module of Object.values(map)) {
      expect(module).toMatchObject({ canRead: true, canCreate: false, canUpdate: false, canDelete: false })
      for (const screen of module.screens) expect(screen).toMatchObject({ canRead: true, canCreate: false, canUpdate: false, canDelete: false })
    }
  })

  it('un módulo que sí trae el servidor se respeta tal cual y los demás siguen en solo lectura', () => {
    const fromServer = { moduleKey: 'shop', canRead: true, canCreate: true, canUpdate: false, canDelete: false, screens: [] }
    const map = buildModulesMap([fromServer])
    expect(map.shop).toBe(fromServer)
    expect(map.wallet.canCreate).toBe(false)
  })

  it('crea una pantalla por cada subítem del menú', () => {
    const map = buildModulesMap([])
    const shop = MENU_ITEMS.find((item) => item.id === 'shop')
    expect(map.shop.screens.map((screen) => screen.screenKey)).toEqual(shop?.subitems.map((sub) => sub.id))
  })
})
