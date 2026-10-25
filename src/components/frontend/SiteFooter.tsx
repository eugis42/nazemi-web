import Link from 'next/link'
import type { CSSProperties } from 'react'

import type { Site } from '@/payload-types'

import { FormOrLinkButton } from '@/components/frontend/FormOrLinkButton'
import { Divider } from '@/components/frontend/ui'
import { isColorToken, resolveColor } from '@/lib/colors'
import { mediaAlt, mediaURL, withSiteQuery } from '@/lib/content'
import { resolveNavTarget } from '@/lib/nav-target'

const DONATE_BG_CLASS: Record<string, string> = {
  sky: 'bg-sky',
  green: 'bg-green',
  violet: 'bg-violet',
  orange: 'bg-orange',
  turquoise: 'bg-turquoise',
  blue: 'bg-blue',
  nerust: 'bg-nerust',
  pink: 'bg-pink',
  brown: 'bg-brown',
  gray: 'bg-gray',
}

function donateBannerSurface(color?: string | null): {
  className: string
  style?: CSSProperties
} {
  const value = color?.trim() || 'violet'
  if (isColorToken(value) && DONATE_BG_CLASS[value]) {
    return { className: DONATE_BG_CLASS[value] }
  }
  const resolved = resolveColor(value)
  if (resolved) return { className: '', style: { backgroundColor: resolved } }
  return { className: 'bg-violet' }
}

const FOOTER_LINK_CLASS =
  'text-ground underline underline-offset-2 transition-opacity hover:opacity-70'

function FooterNavLink({
  siteSlug,
  target,
}: {
  siteSlug: string
  target: NonNullable<ReturnType<typeof resolveNavTarget>>
}) {
  if (target.kind === 'form') {
    return (
      <FormOrLinkButton
        className="!border-0 !bg-transparent !px-0 !py-0 !shadow-none"
        formId={target.formId}
        formTitle={target.formTitle}
        variant="outline-ground"
      >
        <span className={FOOTER_LINK_CLASS}>{target.label}</span>
      </FormOrLinkButton>
    )
  }

  const href = target.external ? target.href : withSiteQuery(target.href, siteSlug)
  return (
    <a
      className={FOOTER_LINK_CLASS}
      href={href}
      rel={target.external ? 'noopener noreferrer' : undefined}
      target={target.external ? '_blank' : undefined}
    >
      {target.external ? `↗ ${target.label}` : target.label}
    </a>
  )
}

export function SiteFooter({ site }: { site: Site }) {
  const donate = site.donateCta
  const donateTarget = resolveNavTarget({
    href: donate?.href,
    label: donate?.buttonLabel,
    linkType: donate?.linkType,
    reference: donate?.reference,
  })
  const showDonateButton = Boolean(donateTarget)
  const showDonate = Boolean(
    donate?.title?.trim() || donate?.body?.trim() || showDonateButton,
  )
  const newsletters = site.newsletters || []
  /** Design footer stays compact — only the first contact block. */
  const contacts = (site.contactDetails || []).slice(0, 1)
  const logo = site.logo && typeof site.logo === 'object' ? site.logo : null
  const logoUrl = mediaURL(logo)
  const donateSurface = donateBannerSurface(donate?.backgroundColor)
  const footerLinks = (site.footerMenu || [])
    .map((item) => resolveNavTarget(item))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  const socialLinks = (site.socialLinks || []).filter((link) => link.url)

  return (
    <footer className="border-2 border-ground bg-sky" data-component="site-footer">
      {showDonate ? (
        <section
          className={`blend-multiply ${donateSurface.className}`.trim()}
          data-block="donate-cta"
          data-component="donate-banner"
          style={donateSurface.style}
        >
          <div className="flex flex-col gap-2.5 p-card text-ground">
            {donate?.title ? <h2 className="text-card-title text-ground">{donate.title}</h2> : null}
            {donate?.body ? <p className="text-body-inter text-ground">{donate.body}</p> : null}
            {donateTarget ? (
              <FormOrLinkButton
                formId={donateTarget.kind === 'form' ? donateTarget.formId : null}
                formTitle={donateTarget.kind === 'form' ? donateTarget.formTitle : null}
                href={
                  donateTarget.kind === 'link'
                    ? donateTarget.external
                      ? donateTarget.href
                      : withSiteQuery(donateTarget.href, site.slug)
                    : undefined
                }
                newTab={donateTarget.kind === 'link' ? true : undefined}
                variant="filled-sky"
              >
                {donateTarget.label}
              </FormOrLinkButton>
            ) : null}
          </div>
        </section>
      ) : null}

      {showDonate && newsletters.length ? <Divider /> : null}

      {newsletters.length ? (
        <section
          className="flex flex-col lg:flex-row"
          data-block="newsletters"
          data-component="newsletter-grid"
        >
          {newsletters.map((item, index) => {
            const isLast = index === newsletters.length - 1
            const separators = [
              index > 0 ? 'lg:border-l-2 lg:border-l-ground' : '',
              !isLast ? 'border-b-2 border-b-ground lg:border-b-0' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const target = resolveNavTarget({
              href: item.href,
              label: item.subscribeLabel || 'Přihlásit se k odběru',
              linkType: item.linkType,
              reference: item.reference,
              url: item.subscribeUrl,
            })

            return (
              <div
                className={`flex flex-1 flex-col p-card ${separators}`}
                data-component="newsletter-column"
                key={`${item.title}-${index}`}
              >
                <div className="flex flex-1 flex-col justify-between gap-6">
                  <div className="flex flex-col gap-2.5">
                    <h3 className="text-section-title text-ground">{item.title}</h3>
                    {item.description ? (
                      <p className="font-inter text-sm font-medium leading-snug text-ground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  {target ? (
                    <FormOrLinkButton
                      className="!text-[14px]"
                      formId={target.kind === 'form' ? target.formId : null}
                      formTitle={target.kind === 'form' ? target.formTitle : null}
                      href={
                        target.kind === 'link'
                          ? target.external
                            ? target.href
                            : withSiteQuery(target.href, site.slug)
                          : undefined
                      }
                      newTab={target.kind === 'link' ? true : undefined}
                      variant="outline-ground"
                    >
                      {target.label}
                    </FormOrLinkButton>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <Divider />

      {/*
        Mobile: stack.
        Tablet (md–lg): logo | contact↗ ; social+menu | copyright↘.
        Desktop (lg+): logo+contact left; social | menu | copyright right.
      */}
      <div
        className="flex flex-col gap-8 p-card lg:flex-row lg:items-center lg:justify-between"
        data-component="footer-bar"
      >
        <div
          className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between lg:items-center lg:justify-start lg:gap-8"
          data-component="footer-identity"
        >
          <Link
            aria-label={`${site.name} — domů`}
            className="inline-block shrink-0"
            data-component="logo"
            href={withSiteQuery('/', site.slug)}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={mediaAlt(logo, site.name)}
                className="h-[45px] w-auto lg:h-[57px]"
                height={57}
                src={logoUrl}
                width={116}
              />
            ) : (
              <span className="font-saans text-lg text-ground">{site.name}</span>
            )}
          </Link>
          {contacts.map((block, index) => {
            const addressLines = (block.addressLines || [])
              .map((row) => row.line)
              .filter((line): line is string => Boolean(line))
            const heading =
              addressLines[0] && addressLines[0].startsWith(block.title || '')
                ? addressLines[0]
                : block.title
            const rest =
              addressLines[0] && addressLines[0].startsWith(block.title || '')
                ? addressLines.slice(1)
                : addressLines.filter((line) => line !== block.title)

            return (
              <div
                className="font-inter text-sm font-medium leading-snug text-ground md:text-right lg:text-left"
                key={`${block.title}-${index}`}
              >
                <p className="m-0">
                  {heading}
                  {rest.length ? (
                    <>
                      <br />
                      {rest.join(', ')}
                    </>
                  ) : null}
                  {block.email ? (
                    <>
                      <br />
                      <a className="text-inherit no-underline" href={`mailto:${block.email}`}>
                        {block.email}
                      </a>
                    </>
                  ) : null}
                  {block.phone ? (
                    <>
                      <br />
                      <a
                        className="text-inherit no-underline"
                        href={`tel:${block.phone.replace(/[^\d+]/g, '')}`}
                      >
                        {block.phone}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            )
          })}
        </div>

        <div
          className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between lg:items-start lg:justify-end lg:gap-10 xl:gap-12"
          data-component="footer-end"
        >
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10 lg:gap-10 xl:gap-12">
            {socialLinks.length ? (
              <nav
                aria-label="Sociální sítě"
                className="font-inter text-sm font-medium leading-snug text-ground lg:text-right"
                data-component="footer-social"
              >
                <p className="m-0">
                  {socialLinks.map((link, index) => (
                    <span key={`${link.network}-${index}`}>
                      {index > 0 ? <br /> : null}
                      <a
                        className="text-ground underline underline-offset-2 transition-opacity hover:opacity-70"
                        href={link.url!}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {link.network}
                      </a>
                    </span>
                  ))}
                </p>
              </nav>
            ) : null}

            {footerLinks.length ? (
              <nav
                aria-label="Menu v patičce"
                className="font-inter text-sm font-medium leading-snug text-ground lg:text-right"
                data-component="footer-menu"
              >
                <p className="m-0">
                  {footerLinks.map((target, index) => (
                    <span key={`${target.kind === 'form' ? target.formId : target.href}-${index}`}>
                      {index > 0 ? <br /> : null}
                      <FooterNavLink siteSlug={site.slug} target={target} />
                    </span>
                  ))}
                </p>
              </nav>
            ) : null}
          </div>

          <div
            className="font-inter text-sm font-medium leading-snug text-ground md:text-right"
            data-component="footer-credits"
          >
            <p className="m-0">
              © {site.name}, {new Date().getFullYear()}
              <br />
              Všechna práva vyhrazena
            </p>
            <p className="m-0 mt-3">
              Design &amp; Dev by{' '}
              <a
                className="text-ground underline underline-offset-2 transition-opacity hover:opacity-70"
                href="https://eugeneugen.eu"
                rel="noopener noreferrer"
                target="_blank"
              >
                eugeneugen
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
