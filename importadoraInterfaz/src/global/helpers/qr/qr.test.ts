import { describe, expect, it } from 'vitest'
import { qrDataUrl } from './qr'

describe('qrDataUrl', () => {
  it('devuelve una imagen PNG en data URL', async () => {
    const url = await qrDataUrl('IP|L|1|ESTANTE-A')
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(url.length).toBeGreaterThan(200)
  })

  it('textos distintos dan imágenes distintas', async () => {
    expect(await qrDataUrl('IP|L|1|A')).not.toBe(await qrDataUrl('IP|L|1|B'))
  })

  it('rechaza un texto vacío', async () => {
    await expect(qrDataUrl('')).rejects.toThrow('No hay texto')
  })
})
