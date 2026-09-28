/**
 * Lexical text-colour tokens (TextStateFeature).
 * Shared by admin editor + FE converter — no Payload imports (RSC-safe).
 *
 * Stored on text nodes as `$: { color: '<token>' }` — never free hex.
 * CSS uses site vars (`--color-ground` / `--color-extra-N`) so FE remaps per site.
 */
export const TEXT_COLOR_STATE_KEY = 'color' as const

/** Brand slots remapped by site primary / accent. */
export const TEXT_COLOR_BRAND_TOKENS = ['ground', 'green'] as const

/** Doplňkové barvy slots — index into site.additionalColors. */
export const TEXT_COLOR_EXTRA_SLOTS = 12 as const

export type TextColorBrandToken = (typeof TEXT_COLOR_BRAND_TOKENS)[number]
export type TextColorExtraToken = `extra-${number}`
export type TextColorToken = TextColorBrandToken | TextColorExtraToken

type StyleObject = { background?: string; border?: string; color?: string }

export type TextColorStateValue = {
  css: StyleObject
  label: string
}

export type TextColorStateConfig = Record<string, TextColorStateValue>

function brandSwatch(token: TextColorBrandToken, label: string): TextColorStateValue {
  const cssVar = `var(--color-${token})`
  // Same fg/bg → “A” glyph invisible; box reads as a solid swatch in the toolbar.
  return {
    label,
    css: {
      background: cssVar,
      border: '1px solid color-mix(in srgb, var(--theme-elevation-800) 20%, transparent)',
      color: cssVar,
    },
  }
}

function extraSwatch(index: number): TextColorStateValue {
  const cssVar = `var(--color-extra-${index})`
  return {
    label: `Doplňková ${index + 1}`,
    css: {
      background: cssVar,
      border: '1px solid color-mix(in srgb, var(--theme-elevation-800) 20%, transparent)',
      color: cssVar,
    },
  }
}

/** TextStateFeature `state.color` map. */
export function buildTextColorState(): TextColorStateConfig {
  const color: TextColorStateConfig = {
    ground: brandSwatch('ground', 'Primární'),
    green: brandSwatch('green', 'Akcent'),
  }
  for (let i = 0; i < TEXT_COLOR_EXTRA_SLOTS; i += 1) {
    color[`extra-${i}`] = extraSwatch(i)
  }
  return color
}

export const textColorState = {
  [TEXT_COLOR_STATE_KEY]: buildTextColorState(),
} as const

export function isTextColorToken(value: string): value is TextColorToken {
  if ((TEXT_COLOR_BRAND_TOKENS as readonly string[]).includes(value)) return true
  const m = /^extra-(\d+)$/.exec(value)
  if (!m) return false
  const n = Number(m[1])
  return Number.isInteger(n) && n >= 0 && n < TEXT_COLOR_EXTRA_SLOTS
}

/** Resolve token → CSS color for FE / admin preview. */
export function textColorCss(token: string): string | undefined {
  if (!isTextColorToken(token)) return undefined
  if (token === 'ground' || token === 'green') return `var(--color-${token})`
  return `var(--color-${token})`
}

/** Build inline style vars for site.additionalColors → `--color-extra-N`. */
export function additionalColorsToCssVars(
  additionalColors: { value?: string | null }[] | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  const list = Array.isArray(additionalColors) ? additionalColors : []
  for (let i = 0; i < TEXT_COLOR_EXTRA_SLOTS; i += 1) {
    const raw = list[i]?.value
    if (typeof raw === 'string' && raw.trim()) {
      out[`--color-extra-${i}`] = raw.trim()
    }
  }
  return out
}
