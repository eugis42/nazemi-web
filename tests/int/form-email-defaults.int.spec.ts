import { describe, expect, it } from 'vitest'

import {
  defaultFormEmailMessage,
  defaultFormEmailSubject,
  remapEmailHtmlFieldKeys,
  withFormEmailDefaults,
} from '@/lib/form-email-defaults'
import { formFieldLabelMap } from '@/lib/form-field-labels'

describe('form email defaults', () => {
  it('builds subject with form + site names', async () => {
    const subject = await defaultFormEmailSubject({
      data: { title: 'Kontakt', site: 1 },
      req: {
        payload: {
          findByID: async () => ({ name: 'NaZemi' }),
        },
      },
    })
    expect(subject).toBe('Nová zpráva z formuláře Kontakt na webu NaZemi')
  })

  it('default body uses {{*:table}} wildcard', () => {
    const msg = defaultFormEmailMessage()
    expect(JSON.stringify(msg)).toContain('{{*:table}}')
  })

  it('maps field names to labels', () => {
    expect(
      formFieldLabelMap([
        { blockType: 'email', label: 'E-mail', name: 'e_mail' },
        { blockType: 'message', name: 'x' },
      ]),
    ).toEqual({
      formSubmissionID: 'ID odpovědi',
      e_mail: 'E-mail',
    })
  })

  it('remaps table + list keys in HTML', () => {
    const html =
      '<div><table><tr><td>e_mail</td><td>a@b.cz</td></tr><tr><td>formSubmissionID</td><td>4</td></tr></table></div>'
    expect(
      remapEmailHtmlFieldKeys(html, {
        e_mail: 'E-mail',
        formSubmissionID: 'ID odpovědi',
      }),
    ).toBe(
      '<div><table><tr><td>E-mail</td><td>a@b.cz</td></tr><tr><td>ID odpovědi</td><td>4</td></tr></table></div>',
    )
  })

  it('patches emails array defaults', () => {
    const patched = withFormEmailDefaults({
      name: 'emails',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'emailFrom', type: 'text' },
            { name: 'replyTo', type: 'text' },
          ],
        },
        { name: 'subject', type: 'text', required: true },
        { name: 'message', type: 'richText' },
      ],
    })

    expect(patched.type).toBe('array')
    if (patched.type !== 'array') return
    const row = patched.fields[0]
    expect(row?.type).toBe('row')
    if (row?.type !== 'row') return
    const from = row.fields.find((f) => 'name' in f && f.name === 'emailFrom')
    expect(from && 'defaultValue' in from && from.defaultValue).toBe('web@nazemi.cz')

    const subject = patched.fields.find((f) => 'name' in f && f.name === 'subject')
    expect(subject && 'defaultValue' in subject && typeof subject.defaultValue).toBe('function')

    const message = patched.fields.find((f) => 'name' in f && f.name === 'message')
    expect(message && 'defaultValue' in message && typeof message.defaultValue).toBe('function')
  })
})
