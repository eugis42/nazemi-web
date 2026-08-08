/** Legacy brand tokens → CSS vars (seed / old docs). New picks store hex. */
const TOKEN_TO_CSS: Record<string, string> = {
  sky: 'var(--color-sky)',
  ground: 'var(--color-ground)',
  green: 'var(--color-green)',
  violet: 'var(--color-violet)',
  orange: 'var(--color-orange)',
  turquoise: 'var(--color-turquoise)',
  blue: 'var(--color-blue)',
  nerust: 'var(--color-nerust)',
  pink: 'var(--color-pink)',
  brown: 'var(--color-brown)',
  gray: 'var(--color-gray)',
}

/** Resolve stored colour (hex / token / none) to a CSS color value. */
export const resolveColor = (value?: string | null): string | undefined => {
  if (!value || value === 'none') return undefined
  const trimmed = value.trim()
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb') ||
    trimmed.startsWith('hsl') ||
    trimmed.startsWith('var(')
  ) {
    return trimmed
  }
  return TOKEN_TO_CSS[trimmed] || trimmed
}

/** True when value is a known legacy token (Tailwind class helpers). */
export const isColorToken = (value?: string | null): boolean =>
  Boolean(value && value !== 'none' && TOKEN_TO_CSS[value])
