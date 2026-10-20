/** First-party form bot checks — no CAPTCHA vendors. */

export const FORM_HONEYPOT_NAME = 'company_url'
export const FORM_MIN_FILL_MS = 2500
export const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000
/** Soft rate limit: max submits per IP in window. */
export const FORM_RATE_LIMIT_MAX = 5
export const FORM_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

export const FORM_BOT_GENERIC_ERROR =
  'Odeslání se nezdařilo. Zkuste to prosím znovu.'
export const FORM_RATE_LIMIT_ERROR =
  'Příliš mnoho pokusů. Zkuste to prosím za chvíli.'

export type FormBotCheckInput = {
  honeypot?: string | null
  openedAt?: number | null
  now?: number
}

export type FormBotCheckResult =
  | { ok: true }
  | { ok: false; reason: 'honeypot' | 'timing' | 'rate'; status: number; message: string }

/** Pure checks (honeypot + timing). Rate limit is separate (mutable). */
export function checkFormBotBasics({
  honeypot,
  openedAt,
  now = Date.now(),
}: FormBotCheckInput): FormBotCheckResult {
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { ok: false, reason: 'honeypot', status: 204, message: '' }
  }

  if (typeof openedAt !== 'number' || !Number.isFinite(openedAt)) {
    return {
      ok: false,
      reason: 'timing',
      status: 400,
      message: FORM_BOT_GENERIC_ERROR,
    }
  }

  const elapsed = now - openedAt
  if (elapsed < FORM_MIN_FILL_MS || elapsed > FORM_MAX_AGE_MS) {
    return {
      ok: false,
      reason: 'timing',
      status: 400,
      message: FORM_BOT_GENERIC_ERROR,
    }
  }

  return { ok: true }
}

/** ponytail: in-process only — upgrade to Redis if multi-instance deploy needs shared limits. */
const rateBuckets = new Map<string, number[]>()

/** Test helper — clear process-level rate buckets. */
export function clearFormRateLimitForTests() {
  rateBuckets.clear()
}

export function checkFormRateLimit(
  ip: string,
  now = Date.now(),
): FormBotCheckResult {
  const key = ip || 'unknown'
  const cutoff = now - FORM_RATE_LIMIT_WINDOW_MS
  const prev = (rateBuckets.get(key) || []).filter((t) => t > cutoff)
  if (prev.length >= FORM_RATE_LIMIT_MAX) {
    rateBuckets.set(key, prev)
    return {
      ok: false,
      reason: 'rate',
      status: 429,
      message: FORM_RATE_LIMIT_ERROR,
    }
  }
  prev.push(now)
  rateBuckets.set(key, prev)
  return { ok: true }
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
