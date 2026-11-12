// recyclebin.realtime.test · la pantalla de papelera recibe el aviso mientras está abierta y deja de recibirlo al cerrarse
import { describe, expect, it, vi } from 'vitest'
import { notifyRecycleBinChanged, onRecycleBinChanged } from './recyclebin.realtime'

describe('papelera en tiempo real', () => {
  it('avisa a la pantalla suscrita y deja de avisar cuando se da de baja', () => {
    const listener = vi.fn()
    const stop = onRecycleBinChanged(listener)
    notifyRecycleBinChanged()
    expect(listener).toHaveBeenCalledTimes(1)
    stop()
    notifyRecycleBinChanged()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
