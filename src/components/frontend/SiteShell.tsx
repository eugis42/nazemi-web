import type { CSSProperties } from 'react'

import type { Site } from '@/payload-types'

import { HeroBackdrop } from '@/components/frontend/BlockRenderers'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/frontend/listing'
import { SiteFooter } from '@/components/frontend/SiteFooter'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import { mediaAlt, mediaSizeURL, mediaURL } from '@/lib/content'
import { filterMenuByEnabledCollections } from '@/lib/enabled-collections'

export function SiteShell({
  backdrop = false,
  beforeMain,
  breadcrumbs,
  children,
  mainClassName = '',
  site,
  stacked = true,
}: {
  backdrop?: boolean
  /** Content between breadcrumbs and `<main>` (design: PageIntro outside main). */
  beforeMain?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  children: React.ReactNode
  mainClassName?: string
  site: Site
  /** Off when the page already renders its own `section-stack` container. */
  stacked?: boolean
}) {
  const logo = site.logo && typeof site.logo === 'object' ? site.logo : null
  const homepageBackground =
    site.homepageBackground && typeof site.homepageBackground === 'object'
      ? site.homepageBackground
      : null
  const mainMenu = filterMenuByEnabledCollections(site.mainMenu, site)

  /**
   * Sub-site branding remaps design tokens:
   * primary → ground (earth text/borders)
   * primaryBackground → sky (page surfaces)
   * accent → green (CTA / filled-green)
   */
  const shellStyle = {
    ...(site.primaryColor ? { ['--color-ground' as string]: site.primaryColor } : {}),
    ...(site.primaryBackgroundColor
      ? { ['--color-sky' as string]: site.primaryBackgroundColor }
      : {}),
    ...(site.accentColor ? { ['--color-green' as string]: site.accentColor } : {}),
  } as CSSProperties

  return (
    <div className="page-shell relative overflow-x-hidden" style={shellStyle}>
      <SiteHeader
        logoAlt={mediaAlt(logo, site.name)}
        logoUrl={mediaURL(logo)}
        mainMenu={mainMenu}
        secondaryMenu={site.secondaryMenu}
        siteName={site.name}
        siteSlug={site.slug}
      />
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      {beforeMain}
      {backdrop ? <HeroBackdrop src={mediaSizeURL(homepageBackground, 'hero') || mediaURL(homepageBackground)} /> : null}
      <main className={`relative z-10 pb-section ${mainClassName}`}>
        {stacked ? <div className="section-stack">{children}</div> : children}
        <div className="container mt-section">
          <SiteFooter site={site} />
        </div>
      </main>
    </div>
  )
}
