import { describe, expect, it } from 'vitest'

import { resolveSafeIframeSrc, validateIframeEmbedSource } from '@/lib/iframe-embed'

describe('resolveSafeIframeSrc', () => {
  it('accepts https URL', () => {
    expect(resolveSafeIframeSrc('https://www.youtube.com/embed/abc')).toBe(
      'https://www.youtube.com/embed/abc',
    )
  })

  it('extracts src from iframe paste', () => {
    const paste =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/xyz" title="t"></iframe>'
    expect(resolveSafeIframeSrc(paste)).toBe('https://www.youtube.com/embed/xyz')
  })

  it('rejects http, javascript, scripts', () => {
    expect(resolveSafeIframeSrc('http://example.com')).toBeNull()
    expect(resolveSafeIframeSrc('javascript:alert(1)')).toBeNull()
    expect(resolveSafeIframeSrc('<script>alert(1)</script>')).toBeNull()
    expect(
      resolveSafeIframeSrc('<iframe src="https://ok.example"></iframe><script>x</script>'),
    ).toBeNull()
  })

  it('validate mirrors resolve', () => {
    expect(validateIframeEmbedSource('https://maps.google.com/?q=1')).toBe(true)
    expect(validateIframeEmbedSource('<iframe src="https://a.test/e"></iframe>')).toBe(true)
    expect(validateIframeEmbedSource('not a url')).not.toBe(true)
  })
})
