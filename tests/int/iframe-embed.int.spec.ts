import { describe, expect, it } from 'vitest'

import {
  resolveSafeIframeEmbed,
  resolveSafeIframeSrc,
  validateIframeEmbedSource,
} from '@/lib/iframe-embed'

describe('resolveSafeIframeEmbed', () => {
  it('accepts https URL as iframe', () => {
    expect(resolveSafeIframeEmbed('https://www.youtube.com/embed/abc')).toEqual({
      kind: 'iframe',
      src: 'https://www.youtube.com/embed/abc',
    })
  })

  it('extracts src + size from iframe paste', () => {
    const paste =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/xyz" title="t"></iframe>'
    expect(resolveSafeIframeEmbed(paste)).toEqual({
      kind: 'iframe',
      src: 'https://www.youtube.com/embed/xyz',
      width: '560',
      height: '315',
    })
  })

  it('accepts allowlisted script tag', () => {
    const paste =
      '<script src="https://widget.proca.app/d/fashion_transition/nazemicz" async></script>'
    expect(resolveSafeIframeEmbed(paste)).toEqual({
      kind: 'script',
      src: 'https://widget.proca.app/d/fashion_transition/nazemicz',
    })
  })

  it('treats bare allowlisted URL as script (not dead JS iframe)', () => {
    expect(
      resolveSafeIframeEmbed('https://widget.proca.app/d/fashion_transition/nazemicz'),
    ).toEqual({
      kind: 'script',
      src: 'https://widget.proca.app/d/fashion_transition/nazemicz',
    })
  })

  it('rejects http, javascript, inline scripts, unknown script hosts', () => {
    expect(resolveSafeIframeSrc('http://example.com')).toBeNull()
    expect(resolveSafeIframeSrc('javascript:alert(1)')).toBeNull()
    expect(resolveSafeIframeSrc('<script>alert(1)</script>')).toBeNull()
    expect(
      resolveSafeIframeSrc(
        '<script src="https://widget.proca.app/x"></script><script>x</script>',
      ),
    ).toBeNull()
    expect(
      resolveSafeIframeSrc('<iframe src="https://ok.example"></iframe><script>x</script>'),
    ).toBeNull()
    expect(
      resolveSafeIframeSrc('<script src="https://evil.example/widget.js"></script>'),
    ).toBeNull()
    expect(
      resolveSafeIframeSrc(
        '<script src="https://widget.proca.app/x">alert(1)</script>',
      ),
    ).toBeNull()
  })

  it('validate mirrors resolve', () => {
    expect(validateIframeEmbedSource('https://maps.google.com/?q=1')).toBe(true)
    expect(validateIframeEmbedSource('<iframe src="https://a.test/e"></iframe>')).toBe(true)
    expect(
      validateIframeEmbedSource(
        '<script src="https://widget.proca.app/d/fashion_transition/nazemicz" async></script>',
      ),
    ).toBe(true)
    expect(validateIframeEmbedSource('not a url')).not.toBe(true)
    expect(
      validateIframeEmbedSource('<script src="https://cdn.example/x.js"></script>'),
    ).not.toBe(true)
  })
})
