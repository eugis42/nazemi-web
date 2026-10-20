import { describe, expect, it } from 'vitest'

import { mediaPath, mediaURL } from '@/lib/content'

describe('mediaPath', () => {
  it('keeps relative paths', () => {
    expect(mediaPath('/api/media/file/x.webp')).toBe('/api/media/file/x.webp')
  })

  it('strips absolute origin so host/port mismatch cannot break imgs', () => {
    expect(mediaPath('http://localhost:3000/api/media/file/x.webp')).toBe(
      '/api/media/file/x.webp',
    )
    expect(mediaPath('https://novy.nazemi.cz/api/media/file/x.webp?v=1')).toBe(
      '/api/media/file/x.webp?v=1',
    )
  })

  it('mediaURL nulls non-objects', () => {
    expect(mediaURL(null)).toBeNull()
    expect(mediaURL(12)).toBeNull()
  })
})
