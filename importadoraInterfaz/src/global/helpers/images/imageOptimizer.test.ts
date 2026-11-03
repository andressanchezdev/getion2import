import { describe, it, expect } from 'vitest'
import { formatBytes, optimizeImageFile } from './imageOptimizer'

describe('imageOptimizer helper', () => {
  it('formats byte numbers into human readable units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(5242880)).toBe('5 MB')
  })

  it('handles negative or invalid sizes safely', () => {
    expect(formatBytes(-100)).toBe('0 B')
  })

  it('runs optimizeImageFile without throwing', async () => {
    const file = new File(['mock content'], 'test.txt', { type: 'text/plain' })
    const result = await optimizeImageFile(file)
    expect(result).toBeDefined()
    expect(result.originalSizeBytes).toBe(file.size)
  })
})
