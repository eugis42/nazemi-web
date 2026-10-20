import { describe, expect, it } from 'vitest'

import { assignFormFieldKeys, formFieldKey, uniqueFormFieldKey } from '@/lib/form-field-keys'
import { simplifyFormFieldBlock } from '@/lib/form-builder-field-blocks'
import { fields as formBuilderFields } from '@payloadcms/plugin-form-builder'

describe('formFieldKey', () => {
  it('slugifies and uniquifies', () => {
    expect(formFieldKey('E-mailová adresa')).toBe('e_mailova_adresa')
    const used = new Set<string>()
    expect(uniqueFormFieldKey('Jméno', used)).toBe('jmeno')
    expect(uniqueFormFieldKey('Jméno', used)).toBe('jmeno2')
    expect(uniqueFormFieldKey('Jméno', used)).toBe('jmeno3')
  })

  it('assigns keys from labels on form fields + options', () => {
    const next = assignFormFieldKeys([
      { blockType: 'text', label: 'E-mail' },
      { blockType: 'text', label: 'E-mail' },
      {
        blockType: 'select',
        label: 'Barva',
        options: [{ label: 'Červená' }, { label: 'Červená' }, { label: 'Modrá' }],
      },
    ]) as { name: string; options?: { value: string }[] }[]

    expect(next[0].name).toBe('e_mail')
    expect(next[1].name).toBe('e_mail2')
    expect(next[2].options?.map((o) => o.value)).toEqual(['cervena', 'cervena2', 'modra'])
  })

  it('strips width from text block', () => {
    const simplified = simplifyFormFieldBlock(formBuilderFields.text as never)
    const flat = JSON.stringify(simplified.fields)
    expect(flat).not.toContain('"name":"width"')
    expect(flat).toContain('"hidden":true')
  })
})
