import type { CSSProperties } from 'react'

import type { ContentBlock } from '@/components/frontend/BlockRenderers'

import { FileTextIcon } from '@/components/frontend/icons'
import { PillarFormCardClient } from '@/components/frontend/PillarFormCard'
import { PillarsVenn } from '@/components/frontend/PillarsVenn'
import { BlockHeader, Button } from '@/components/frontend/ui'
import { resolveBlockActions } from '@/lib/block-actions'
import { resolveColor } from '@/lib/colors'
import { withSiteQuery } from '@/lib/content'
import { isDocumentHref } from '@/lib/links'
import { resolveNavTarget } from '@/lib/nav-target'

/** Document downloads (the Manifest PDF in the design) carry a file icon. */
function isDocumentAction({ href, label }: { href?: string; label?: string }) {
  return Boolean(isDocumentHref(href) || label?.includes('Manifest'))
}

function PillarInner({
  body,
  buttonLabel,
  color,
  title,
}: {
  body?: string
  buttonLabel?: string | null
  color: string
  title?: string
}) {
  return (
    <>
      <div className="flex flex-col gap-grid">
        <span
          aria-hidden="true"
          className="size-[30px] shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-display">{title}</h3>
        <p className="text-body-inter">{body}</p>
      </div>
      {buttonLabel ? (
        <Button tag="span" variant="outline">
          {buttonLabel}
        </Button>
      ) : null}
    </>
  )
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
      body?: string
      buttonLabel?: string
      color?: string
      href?: string
      linkType?: 'internal' | 'external' | null
      reference?: unknown
      title?: string
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
            const target = resolveNavTarget({
              href: pillar.href,
              label: pillar.buttonLabel,
              linkType: pillar.linkType,
              reference: pillar.reference,
            })
            const cardStyle = { ['--pillar-dot' as string]: color } as CSSProperties
            const label = target?.label || pillar.buttonLabel || null
            const inner = (
              <PillarInner
                body={pillar.body}
                buttonLabel={label}
                color={color}
                title={pillar.title}
              />
            )

            if (target?.kind === 'link') {
              return (
                <a
                  aria-label={`${pillar.title}. ${target.label}`}
                  className="card-tile flex flex-col justify-between gap-grid p-card lg:min-h-[482px]"
                  data-component="pillar-column"
                  href={withSiteQuery(target.href, siteSlug)}
                  key={`${pillar.title}-${index}`}
                  style={cardStyle}
                >
                  {inner}
                </a>
              )
            }

            if (target?.kind === 'form') {
              return (
                <PillarFormCardClient
                  ariaLabel={`${pillar.title}. ${target.label}`}
                  formId={target.formId}
                  formTitle={target.formTitle}
                  key={`${pillar.title}-${index}`}
                  style={cardStyle}
                >
                  {inner}
                </PillarFormCardClient>
              )
            }

            return (
              <div
                className="card-tile flex flex-col justify-between gap-grid p-card lg:min-h-[482px]"
                data-component="pillar-column"
                key={`${pillar.title}-${index}`}
                style={cardStyle}
              >
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
