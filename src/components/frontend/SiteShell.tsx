import type { Site } from '@/payload-types'

import { HeroBackdrop } from '@/components/frontend/HeroBackdrop'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/frontend/listing'
import { SiteFooter } from '@/components/frontend/SiteFooter'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import { mediaAlt, mediaSizeURL, mediaURL, siteBrandStyle } from '@/lib/content'
import { filterMenuByEnabledCollections } from '@/lib/enabled-collections'
import { nestedMainMenu } from '@/lib/menu'

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
  const mainMenu = filterMenuByEnabledCollections(nestedMainMenu(site.mainMenu), site)
  const isSubsite = site.siteType === 'subsite'
  // SVGs: always original file (vector). Raster: prefer hero size.
  const bgMime = homepageBackground?.mimeType || ''
  const bgUrl = homepageBackground?.url || homepageBackground?.filename || ''
  const bgIsSvg = bgMime === 'image/svg+xml' || /\.svg([?#]|$)/i.test(bgUrl)
  const backdropSrc = bgIsSvg
    ? mediaURL(homepageBackground)
    : mediaSizeURL(homepageBackground, 'hero') || mediaURL(homepageBackground)

  return (
    <div className="page-shell relative" style={siteBrandStyle(site)}>
      <div className="relative z-20 overflow-x-hidden">
        <SiteHeader
          logoAlt={mediaAlt(logo, site.name)}
          logoNavbarPadding={site.logoNavbarPadding}
          logoUrl={mediaURL(logo)}
          mainMenu={mainMenu}
          secondaryMenu={site.secondaryMenu}
          siteName={site.name}
          siteSlug={site.slug}
        />
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        {beforeMain}
      </div>
      {backdrop ? (
        <HeroBackdrop
          // All subsites share NaNebi framing (75vh cover); main keeps vh/full-bleed.
          fitWidth={isSubsite}
          src={backdropSrc}
        />
      ) : null}
      <main className={`relative z-10 overflow-x-hidden pb-section ${mainClassName}`}>
        {stacked ? <div className="section-stack">{children}</div> : children}
        <div className="container mt-section">
          <SiteFooter site={site} />
        </div>
      </main>
    </div>
  )
}
