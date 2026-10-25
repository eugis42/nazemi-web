import { describe, expect, it } from 'vitest'

import { resolveNavTarget } from '@/lib/nav-target'

describe('resolveNavTarget', () => {
  it('resolves form internal reference to modal target', () => {
    const target = resolveNavTarget({
      label: 'Objednat',
      linkType: 'internal',
      reference: {
        relationTo: 'forms',
        value: { id: 42, title: 'Objednávka workshopu' },
      },
    })
    expect(target).toEqual({
      kind: 'form',
      formId: 42,
      label: 'Objednat',
      formTitle: 'Objednávka workshopu',
      form: { id: 42, title: 'Objednávka workshopu' },
    })
  })

  it('keeps legacy doc CTA url field', () => {
    const target = resolveNavTarget({
      title: 'Koupit',
      url: 'https://example.com/buy',
    })
    expect(target).toMatchObject({
      kind: 'link',
      href: 'https://example.com/buy',
      label: 'Koupit',
      external: true,
    })
  })

  it('allows empty optional CTA (no label, no target)', () => {
    expect(resolveNavTarget({ linkType: 'external', href: '' })).toBeNull()
  })
})
