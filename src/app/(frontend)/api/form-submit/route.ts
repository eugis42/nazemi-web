import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getPayloadClient } from '@/lib/frontend'
import {
  checkFormBotBasics,
  checkFormRateLimit,
  clientIpFromHeaders,
  FORM_BOT_GENERIC_ERROR,
} from '@/lib/form-bot-guard'

type SubmissionRow = { field: string; value: string }

function asSubmissionData(raw: unknown): SubmissionRow[] | null {
  if (!Array.isArray(raw)) return null
  const rows: SubmissionRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const field = (item as { field?: unknown }).field
    const value = (item as { value?: unknown }).value
    if (typeof field !== 'string' || !field.trim()) return null
    if (value === null || value === undefined) continue
    rows.push({ field: field.trim(), value: String(value) })
  }
  return rows
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: FORM_BOT_GENERIC_ERROR }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: FORM_BOT_GENERIC_ERROR }, { status: 400 })
  }

  const data = body as {
    form?: unknown
    honeypot?: unknown
    openedAt?: unknown
    submissionData?: unknown
  }

  const bot = checkFormBotBasics({
    honeypot: typeof data.honeypot === 'string' ? data.honeypot : '',
    openedAt: typeof data.openedAt === 'number' ? data.openedAt : null,
  })
  if (!bot.ok) {
    if (bot.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json({ error: bot.message }, { status: bot.status })
  }

  const rate = checkFormRateLimit(clientIpFromHeaders(request.headers))
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status })
  }

  const formRaw =
    typeof data.form === 'number' || typeof data.form === 'string' ? data.form : null
  const formId =
    typeof formRaw === 'string' && /^\d+$/.test(formRaw) ? Number(formRaw) : formRaw
  const submissionData = asSubmissionData(data.submissionData)
  if (formId == null || formId === '' || !submissionData) {
    return NextResponse.json({ error: FORM_BOT_GENERIC_ERROR }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    const form = await payload.findByID({
      collection: 'forms',
      depth: 1,
      id: formId,
      overrideAccess: true,
    })

    const doc = await payload.create({
      collection: 'form-submissions',
      data: {
        form: formId as number,
        submissionData,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      confirmationMessage: form.confirmationMessage ?? null,
      confirmationType: form.confirmationType ?? 'message',
      doc: { id: doc.id },
      redirect: form.redirect ?? null,
    })
  } catch (err) {
    console.error('[form-submit]', err)
    return NextResponse.json({ error: FORM_BOT_GENERIC_ERROR }, { status: 500 })
  }
}
