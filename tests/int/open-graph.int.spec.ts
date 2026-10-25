import { describe, expect, it } from 'vitest'

import { assertPublicHttpUrl } from '@/lib/open-graph'

describe('open-graph SSRF guards', () => {
  it('allows public https URLs', () => {
    expect(assertPublicHttpUrl('https://example.com/path').hostname).toBe('example.com')
  })

  it('rejects localhost and private ranges', () => {
    expect(() => assertPublicHttpUrl('http://localhost/x')).toThrow(/neveřejný/)
    expect(() => assertPublicHttpUrl('http://127.0.0.1/x')).toThrow(/neveřejný/)
    expect(() => assertPublicHttpUrl('http://192.168.1.1/x')).toThrow(/neveřejný/)
    expect(() => assertPublicHttpUrl('http://10.0.0.2/x')).toThrow(/neveřejný/)
  })

  it('rejects non-http schemes', () => {
    expect(() => assertPublicHttpUrl('file:///etc/passwd')).toThrow()
    expect(() => assertPublicHttpUrl('javascript:alert(1)')).toThrow()
  })
})
