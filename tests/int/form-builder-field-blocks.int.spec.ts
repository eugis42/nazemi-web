import { describe, expect, it } from 'vitest'

import { nazemiFormBuilderFields } from '@/lib/form-builder-field-blocks'

describe('nazemiFormBuilderFields', () => {
  it('renames labels, disables country, adds workshops', () => {
    const fields = nazemiFormBuilderFields()

    expect(fields.country).toBe(false)
    expect(fields.payment).toBe(false)

    const text = fields.text
    expect(text && typeof text === 'object' && text.labels?.singular).toBe('Textové pole')

    const select = fields.select
    expect(select && typeof select === 'object' && select.labels?.singular).toBe(
      'Výběr z menu (Dropdown)',
    )

    const radio = fields.radio
    expect(radio && typeof radio === 'object' && radio.labels?.singular).toBe(
      'Výběr z možností (Radio button)',
    )

    const textarea = fields.textarea
    expect(textarea && typeof textarea === 'object' && textarea.labels?.singular).toBe(
      'Dlouhé textové pole',
    )

    const message = fields.message
    expect(message && typeof message === 'object' && message.labels?.singular).toBe(
      'Textový blok',
    )

    const workshops = fields.workshops
    expect(workshops && typeof workshops === 'object' && workshops.slug).toBe('workshops')
    expect(workshops && typeof workshops === 'object' && workshops.labels?.singular).toBe(
      'Výběr z Workshopů',
    )
  })

  it('adds Popis under label; keeps Povinné on its own row for email', () => {
    const fields = nazemiFormBuilderFields()
    const email = fields.email
    expect(email && typeof email === 'object').toBe(true)
    if (!email || typeof email !== 'object') return

    const names = email.fields.map((f) => ('name' in f ? f.name : f.type))
    expect(names).toContain('description')
    expect(names.indexOf('label')).toBeLessThan(names.indexOf('description'))
    // Povinné not paired with label
    expect(email.fields.some((f) => f.type === 'row')).toBe(false)
    const required = email.fields.find((f) => 'name' in f && f.name === 'required')
    expect(required?.type).toBe('checkbox')
  })

  it('packs trailing checkboxes onto one row for checkbox block', () => {
    const fields = nazemiFormBuilderFields()
    const checkbox = fields.checkbox
    expect(checkbox && typeof checkbox === 'object').toBe(true)
    if (!checkbox || typeof checkbox !== 'object') return

    const row = checkbox.fields.find((f) => f.type === 'row')
    expect(row && row.type === 'row').toBe(true)
    if (!row || row.type !== 'row') return
    // required + defaultValue (Zaškrtnuto) side by side
    expect(row.fields.filter((f) => f.type === 'checkbox')).toHaveLength(2)
  })
})
