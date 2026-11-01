import { describe, expect, it } from 'vitest'

import {
  applySubjectTokens,
  defaultFormEmailMessage,
  defaultFormEmailSubject,
  nazemiFormBeforeEmail,
  remapEmailHtmlFieldKeys,
  withFormEmailDefaults,
} from '@/lib/form-email-defaults'
import { formFieldLabelMap } from '@/lib/form-field-labels'

describe('form email defaults', () => {
  it('default subject uses siteName + formTitle tokens', () => {
    expect(defaultFormEmailSubject()).toBe(
      '{{siteName}}: Vyplněný formulář {{formTitle}}',
    )
  })

  it('resolves braced tokens and bare names left by replaceDoubleCurlys', () => {
    expect(
      applySubjectTokens('{{siteName}}: Vyplněný formulář {{formTitle}}', 'NaZemi', 'Kontakt'),
    ).toBe('NaZemi: Vyplněný formulář Kontakt')
    // Payload replaceDoubleCurlys unknown {{x}} → bare `x` before beforeEmail
    expect(applySubjectTokens('siteName: Vyplněný formulář formTitle', 'Flowmakers', 'Poptávka')).toBe(
      'Flowmakers: Vyplněný formulář Poptávka',
    )
  })

  it('beforeEmail rewrites subject with real site + form titles', async () => {
    const emails = await nazemiFormBeforeEmail(
      [
        {
          from: 'web@nazemi.cz',
          html: '<div></div>',
          subject: 'siteName: Vyplněný formulář formTitle',
          to: 'a@b.cz',
        },
      ],
      {
        data: { form: 7 },
        req: {
          payload: {
            findByID: async ({ collection }: { collection: string }) => {
              if (collection === 'forms') {
                return { fields: [], site: 3, title: 'Přihláška workshop' }
              }
              if (collection === 'sites') {
                return { name: 'Flowmakers' }
              }
              return null
            },
          },
        },
      } as never,
    )
    expect(emails[0]?.subject).toBe('Flowmakers: Vyplněný formulář Přihláška workshop')
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
