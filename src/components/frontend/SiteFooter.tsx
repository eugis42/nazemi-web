import Link from 'next/link'

import type { Site } from '@/payload-types'

import { Button, Divider } from '@/components/frontend/ui'
import { mediaAlt, mediaURL, withSiteQuery } from '@/lib/content'

export function SiteFooter({ site }: { site: Site }) {
  const donate = site.donateCta
  const newsletters = site.newsletters || []
  /** Design footer stays compact — only the two primary contacts. */
  const contacts = (site.contactDetails || []).slice(0, 2)
  const logo = site.logo && typeof site.logo === 'object' ? site.logo : null
  const logoUrl = mediaURL(logo)

  return (
    <footer className="border-2 border-ground bg-sky" data-component="site-footer">
      <section
        className="blend-multiply bg-violet"
        data-block="donate-cta"
        data-component="donate-banner"
      >
        <div className="flex flex-col gap-2.5 p-card">
          <h2 className="text-card-title">{donate?.title || 'Podpořte NaZemi'}</h2>
          {donate?.body ? <p className="text-body-inter">{donate.body}</p> : null}
          {donate?.href ? (
            <Button href={donate.href} newTab variant="filled-sky">
              {donate?.buttonLabel || 'Podpořit'}
            </Button>
          ) : null}
        </div>
      </section>

      {newsletters.length ? <Divider /> : null}

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

            return (
              <div
                className={`flex flex-1 flex-col p-card ${separators}`}
                data-component="newsletter-column"
                key={`${item.title}-${index}`}
              >
                <div className="flex flex-1 flex-col justify-between gap-6">
                  <div className="flex flex-col gap-2.5">
                    <h3 className="text-card-title">{item.title}</h3>
                    {item.description ? (
                      <p className="text-body-inter">{item.description}</p>
                    ) : null}
                  </div>
                  {item.subscribeUrl ? (
                    <Button href={item.subscribeUrl} newTab variant="outline-ground">
                      {item.subscribeLabel || 'Přihlásit se k odběru'}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <Divider />

      <div
        className="flex flex-col gap-8 p-card lg:flex-row lg:items-center lg:justify-between"
        data-component="footer-contact"
      >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-8">
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
              <span className="font-saans text-xl text-ground">{site.name}</span>
            )}
          </Link>
          {contacts.map((block, index) => {
            const addressLines = (block.addressLines || [])
              .map((row) => row.line)
              .filter((line): line is string => Boolean(line))
            // Design footer hardcodes org line as first identity (e.g. "NaNebi, s. r. o.").
            const heading =
              addressLines[0] && addressLines[0].startsWith(block.title || '')
                ? addressLines[0]
                : block.title
            const rest =
              addressLines[0] && addressLines[0].startsWith(block.title || '')
                ? addressLines.slice(1)
                : addressLines.filter((line) => line !== block.title)

            return (
              <div className="text-body-inter" key={`${block.title}-${index}`}>
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
                      {block.email}
                    </>
                  ) : null}
                  {block.phone ? (
                    <>
                      <br />
                      {block.phone}
                    </>
                  ) : null}
                </p>
              </div>
            )
          })}
        </div>
        <div className="text-body-inter text-left lg:text-right">
          {(site.socialLinks || []).length ? (
            <p className="m-0 mb-2 flex flex-wrap gap-x-3 gap-y-1 lg:justify-end" data-component="footer-social">
              {(site.socialLinks || [])
                .filter((link) => link.url)
                .map((link, index) => (
                <a
                  className="text-ground underline"
                  href={link.url!}
                  key={`${link.network}-${index}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.network}
                </a>
              ))}
            </p>
          ) : null}
          <p className="m-0">
            © {site.name}, {new Date().getFullYear()}
            <br />
            Všechna práva vyhrazena
          </p>
          <p className="m-0 mt-2">
            Design &amp; Dev by{' '}
            <a className="text-ground underline" href="#">
              eugeneugen
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
