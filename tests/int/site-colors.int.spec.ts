import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_ADDITIONAL_COLORS } from '@/lib/site-colors'

describe('DEFAULT_ADDITIONAL_COLORS', () => {
  it('matches SVG accent swatch order and basic Czech labels', () => {
    expect(DEFAULT_ADDITIONAL_COLORS.map((c) => [c.label, c.value])).toEqual([
      ['Zelená', '#90d750'],
      ['Žlutá', '#ffd75c'],
      ['Oranžová', '#fcb96d'],
      ['Růžová', '#ff91ac'],
      ['Fialová', '#bda9ff'],
      ['Modrá', '#9fcfff'],
      ['Tyrkysová', '#6acad9'],
      ['Šedá', '#bdccd4'],
      ['Béžová', '#c7b299'],
    ])
  })
})
