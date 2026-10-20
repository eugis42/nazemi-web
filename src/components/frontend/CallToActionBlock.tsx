import { Button } from '@/components/frontend/ui'
import { resolveBlockActions } from '@/lib/block-actions'

type CallToActionFields = {
  actions?: unknown
  title?: string | null
  [key: string]: unknown
}

/** Optional heading + CTA buttons — same link/variant resolution as other blocks. */
export function CallToActionBlockView({
  block,
  siteSlug,
}: {
  block: CallToActionFields
  siteSlug: string
}) {
  const actions = resolveBlockActions({
    actions: block.actions as never,
    siteSlug,
  })
  if (!actions.length) return null

  const title =
    typeof block.title === 'string' && block.title.trim() ? block.title.trim() : null

  return (
    <section className="flex flex-col gap-grid" data-block="callToAction">
      {title ? <h2 className="text-section-title text-ground">{title}</h2> : null}
      <div className="flex flex-wrap items-center justify-start gap-3">
        {actions.map((action, index) =>
          action.label ? (
            <Button
              backgroundColor={action.backgroundColor}
              className="shrink-0"
              external={action.external}
              href={action.href || '#'}
              icon={action.icon}
              key={`${action.label}-${index}`}
              newTab={action.newTab}
              variant={action.variant || 'outline'}
            >
              {action.label}
            </Button>
          ) : null,
        )}
      </div>
    </section>
  )
}
