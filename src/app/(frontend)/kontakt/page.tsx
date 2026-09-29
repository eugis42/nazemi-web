import type { Metadata } from 'next'

import { ContactBlock, TeamMemberCard } from '@/components/frontend/cards'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import { getListingWhere, getPayloadClient, resolveSiteFromCurrentRequest } from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  return buildPageMetadata({ doc: { title: 'Kontakt' }, path: '/kontakt', site })
}

export default async function KontaktPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'lide')
  const payload = await getPayloadClient()
  const people = await payload.find({
    collection: 'lide',
    depth: 1,
    limit: 100,
    sort: 'sortOrder',
    where: await getListingWhere({
      collection: 'lide',
      siteId: site.id,
    }),
  })

  const blocks = site.contactDetails || []
  const socials = (site.socialLinks || []).filter((link) => link.url)
  const single = blocks.length === 1
  const primary = single ? blocks : blocks.slice(0, 2)
  const secondary = single ? [] : blocks.slice(2)
  const showContacts = blocks.length > 0 || socials.length > 0

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/kontakt', site.slug), label: 'Kontakty' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="contact">
          <h1 className="text-display text-ground">Kontakty</h1>

          <div className="flex flex-col gap-section" data-component="contact-directory">
            {showContacts ? (
              <section className="overflow-hidden border-2 border-ground" data-block="contact-info">
                {/* gap-[2px] bg-ground = shared 2px divider (no double borders). */}
                <div className="flex flex-col gap-[2px] bg-ground">
                  {socials.length ? (
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-sky p-card"
                      data-component="contact-social"
                    >
                      {socials.map((link, index) => (
                        <a
                          className="font-inter text-sm font-medium leading-snug text-ground underline"
                          href={link.url!}
                          key={`${link.network}-${index}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {link.network}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {primary.length ? (
                    <div className="flex flex-wrap items-stretch gap-[2px] bg-ground">
                      {primary.map((block, index) => (
                        <ContactBlock
                          block={block}
                          className={
                            single ? 'w-full' : 'w-full lg:w-[calc((100%-2px)/2)]'
                          }
                          key={block.id || `${block.title}-${index}`}
                        />
                      ))}
                    </div>
                  ) : null}
                  {secondary.length ? (
                    <div className="flex flex-wrap items-stretch gap-[2px] bg-ground">
                      {secondary.map((block, index) => (
                        <ContactBlock
                          block={block}
                          className="w-full lg:w-[calc((100%-4px)/3)]"
                          key={block.id || `${block.title}-${index}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {people.docs.length ? (
              <section className="overflow-hidden border-2 border-ground" data-block="contact-team">
                <div className="flex flex-col gap-[2px] bg-ground">
                  <h2 className="bg-sky p-card text-section-title text-ground">Lidé v NaZemi</h2>
                  <div className="flex flex-wrap gap-[2px] bg-ground">
                    {people.docs.map((person) => (
                      <TeamMemberCard key={person.id} person={person} />
                    ))}
                    {/* Design spacers: fill incomplete sm / lg / xl rows so sky gutters stay. */}
                    <div
                      aria-hidden="true"
                      className="hidden shrink-0 grow-0 bg-sky sm:block sm:w-[calc((100%-2px)/2)] lg:hidden xl:block xl:w-[calc((100%-6px)/4)]"
                    />
                    <div
                      aria-hidden="true"
                      className="hidden shrink-0 grow-0 bg-sky lg:block lg:w-[calc((100%-4px)/3)] xl:hidden"
                    />
                    <div
                      aria-hidden="true"
                      className="hidden shrink-0 grow-0 bg-sky lg:block lg:w-[calc((100%-4px)/3)] xl:hidden"
                    />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </SiteShell>
  )
}
