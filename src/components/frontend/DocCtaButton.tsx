import { FormOrLinkButton } from '@/components/frontend/FormOrLinkButton'
import { mapCtaVariant } from '@/lib/block-actions'
import { withSiteQuery } from '@/lib/content'
import { resolveNavTarget } from '@/lib/nav-target'

type DocCta = {
  backgroundColor?: string | null
  href?: string | null
  linkType?: 'internal' | 'external' | null
  reference?: unknown
  title?: string | null
  url?: string | null
  variant?: string | null
}

/** Doc-level `ctas[]` row → link or form modal button. */
export function DocCtaButton({
  className,
  cta,
  external,
  siteSlug = '',
  variant,
}: {
  className?: string
  cta: DocCta
  /** Force external treatment (e.g. workshop order CTA). */
  external?: boolean
  siteSlug?: string
  variant?: string | null
}) {
  const target = resolveNavTarget({
    href: cta.href,
    label: cta.title,
    linkType: cta.linkType,
    reference: cta.reference,
    title: cta.title,
    url: cta.url,
  })
  if (!target) return null

  const resolvedVariant = mapCtaVariant(variant || cta.variant) || 'outline'

  if (target.kind === 'form') {
    return (
      <FormOrLinkButton
        backgroundColor={cta.backgroundColor}
        className={className}
        formId={target.formId}
        formTitle={target.formTitle}
        variant={resolvedVariant}
      >
        {target.label}
      </FormOrLinkButton>
    )
  }

  return (
    <FormOrLinkButton
      backgroundColor={cta.backgroundColor}
      className={className}
      external={external ?? target.external}
      href={
        target.external || external
          ? target.href
          : withSiteQuery(target.href, siteSlug)
      }
      variant={resolvedVariant}
    >
      {target.label}
    </FormOrLinkButton>
  )
}

export function firstDocCta(ctas: DocCta[] | null | undefined): DocCta | null {
  for (const cta of ctas || []) {
    if (resolveNavTarget({
      href: cta.href,
      label: cta.title,
      linkType: cta.linkType,
      reference: cta.reference,
      title: cta.title,
      url: cta.url,
    })) {
      return cta
    }
  }
  return null
}
