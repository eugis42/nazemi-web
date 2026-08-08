import type { ContentBlock } from '@/components/frontend/BlockRenderers'

import { FileTextIcon } from '@/components/frontend/icons'
import { PillarsVenn } from '@/components/frontend/PillarsVenn'
import { BlockHeader, Button } from '@/components/frontend/ui'
import { resolveBlockActions } from '@/lib/block-actions'
import { resolveColor } from '@/lib/colors'
import { withSiteQuery } from '@/lib/content'
import { isDocumentHref } from '@/lib/links'

/** Document downloads (the Manifest PDF in the design) carry a file icon. */
function isDocumentAction({ href, label }: { href?: string; label?: string }) {
  return Boolean(isDocumentHref(href) || label?.includes('Manifest'))
}

/** Server component — the Venn SVG is read from disk, so keep it out of client bundles. */
export async function PillarsBlock({
  block,
  siteSlug,
}: {
  block: ContentBlock
  siteSlug: string
}) {
  const pillars =
    (block.pillars as {
      color?: string
      title?: string
      body?: string
      buttonLabel?: string
      href?: string
    }[]) || []
  const actions = resolveBlockActions({
    actions: block.actions as never,
    siteSlug,
  }).map((action) => {
    const doc = isDocumentAction({ href: action.href || undefined, label: action.label || undefined })
    if (!doc) return action
    return {
      ...action,
      external: false,
      icon: <FileTextIcon />,
      newTab: true,
    }
  })

  return (
    <section data-block="pillars">
      <div className="flex min-w-0 flex-col gap-card" data-component="pillars-block">
        <BlockHeader
          actions={actions}
          title={(block.title as string) || 'O co nám jde'}
        />
        <PillarsVenn />
        <div className="grid grid-cols-1 gap-grid lg:grid-cols-3">
          {pillars.map((pillar, index) => {
            const color = resolveColor(pillar.color) || 'var(--color-violet)'
            return (
              <a
                aria-label={`${pillar.title}. ${pillar.buttonLabel || ''}`}
                className="card-tile flex flex-col justify-between gap-grid p-card lg:min-h-[482px]"
                data-component="pillar-column"
                href={withSiteQuery(pillar.href || '#', siteSlug)}
                key={`${pillar.title}-${index}`}
                style={{ ['--pillar-dot' as string]: color }}
              >
                <div className="flex flex-col gap-grid">
                  <span
                    aria-hidden="true"
                    className="size-[30px] shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-display">{pillar.title}</h3>
                  <p className="text-body-inter">{pillar.body}</p>
                </div>
                {pillar.buttonLabel ? (
                  <Button tag="span" variant="outline">
                    {pillar.buttonLabel}
                  </Button>
                ) : null}
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
