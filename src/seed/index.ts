import 'dotenv/config'

import type { CollectionSlug } from 'payload'
import { getPayload } from 'payload'

import config from '@payload-config'

import {
  EVENT_WORKSHOP_SLUGS,
  eventBodyHtml,
  eventExcerpt,
  genericPageBodyHtml,
  newsBodyHtml,
  newsExcerpt,
  projectBodyHtml,
  tagSlug,
} from './content'
import { CONTACT_BLOCKS, teamMembers } from './data/contact'
import { calendarEvents, featuredEvents } from './data/events'
import { genericPages } from './data/generic-pages'
import {
  about,
  donateCta,
  hero,
  newsletters,
  pillars,
  pillarsActions,
} from './data/homepage'
import { MAIN_LINKS, SECONDARY_LINKS } from './data/navigation'
import { featuredNews, newsArticles } from './data/news'
import { projectPages } from './data/projects'
import {
  PUBLICATION_TOPIC_TAGS,
  PUBLICATION_TYPE_TAGS,
  TYPE_FILTER_IDS,
  publications,
} from './data/publications'
import {
  AUDIENCE_FILTER_IDS,
  WORKSHOP_AUDIENCE_TAGS,
  WORKSHOP_TOPIC_TAGS,
  workshops,
} from './data/workshops'
import { richText, richTextFromHtml } from './html'
import { createMediaLoader, parseCzechDate, slugifyCs, upsertByField } from './utils'

const ADMIN_EMAIL = 'admin@nazemi.local'
const ADMIN_PASSWORD = 'payload-demo-password'

/** Seed helper: old min/max/note pricing → free-text price. */
function formatWorkshopPrice(pricing?: {
  max?: number
  min?: number
  note?: string
} | null) {
  if (!pricing) return null
  const format = (amount: number) => `${amount.toLocaleString('cs-CZ')} Kč`
  const range =
    pricing.min != null && pricing.max != null && pricing.min !== pricing.max
      ? `${format(pricing.min)} – ${format(pricing.max)}`
      : pricing.min != null
        ? `od ${format(pricing.min)}`
        : pricing.max != null
          ? `do ${format(pricing.max)}`
          : null
  if (range && pricing.note) return `${range} (${pricing.note})`
  return range || pricing.note || null
}

/** Czech alt texts for the design assets copied into `public/seed/`. */
const MEDIA_ALT: Record<string, string> = {
  'about-team.jpg': 'Tým NaZemi při společném setkání',
  'event-1.jpg': 'Účastníci workshopu NaZemi v kruhu',
  'event-2.jpg': 'Diskuse na Nerůstové akademii',
  'event-3.jpg': 'Protestní akce v ulicích města',
  'event-body.jpg': 'Fotografie z předchozího ročníku Nerůstové akademie',
  'logo-nazemi.svg': 'Logo NaZemi',
  'logo-subsite.svg': 'Logo NaZemi Brno',
  'svg/hero-backdrop.svg': 'Pozadí homepage — vlna',
  'news-1.jpg': 'Nová kniha z dílny Nerůstu',
  'news-2.jpg': 'Redakce NaZemi u nového webu',
  'news-3.jpg': 'Komunitní prostor NaNebi',
  'news-4.jpg': 'Facilitované setkání v organizaci',
  'project-flowmakers.png': 'Logo projektu Flow Makers',
  'project-nanebi.png': 'Logo projektu NaNebi',
  'project-nerust.png': 'Logo projektu Nerůst',
  'project-symbiocen.png': 'Logo projektu Generace Symbiocén',
}

/** Legacy documents from the first demo seed — removed so the site matches the design. */
const LEGACY_DOCS: { collection: CollectionSlug; slugs: string[] }[] = [
  { collection: 'projekty', slugs: ['skoly-pro-budoucnost'] },
  { collection: 'workshopy', slugs: ['klimaticka-spravedlnost'] },
  {
    collection: 'aktuality',
    slugs: ['spusteni-noveho-webu', 'pripravujeme-letni-program'],
  },
  { collection: 'kalendar', slugs: ['otevreny-workshop-v-praze'] },
  { collection: 'publikace', slugs: ['klima-ve-tride'] },
  { collection: 'lide', slugs: ['jana-novakova', 'petr-svoboda'] },
  { collection: 'workshop-audiences', slugs: ['stredni-skoly'] },
]

const PILLAR_HREFS: Record<string, string> = {
  Ekonomika: '/projekty/nerust',
  'Fungování organizací': '/projekty/flow-makers',
  Vzdělávání: '/vzdelavani',
}

const seed = async () => {
  const payload = await getPayload({ config })
  const media = createMediaLoader(payload)
  const mediaFor = (file: string, alt?: string) =>
    media(file, alt ?? MEDIA_ALT[file] ?? 'Obrázek NaZemi')

  // ---------------------------------------------------------------- admin user
  const existingAdmin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: ADMIN_EMAIL } },
  })

  if (!existingAdmin.docs[0]) {
    await payload.create({
      collection: 'users',
      data: {
        email: ADMIN_EMAIL,
        name: 'NaZemi Admin',
        password: ADMIN_PASSWORD,
        role: 'admin',
      },
      overrideAccess: true,
    })
  }

  const adminId = (
    await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { email: { equals: ADMIN_EMAIL } },
    })
  ).docs[0]?.id

  // -------------------------------------------------------------------- sites
  const [mainLogo, subLogo, aboutTeamImage, brnoSharing, demoProseImage, heroBackdrop] =
    await Promise.all([
      mediaFor('logo-nazemi.svg'),
      mediaFor('logo-subsite.svg'),
      mediaFor('about-team.jpg'),
      mediaFor('news-2.jpg'),
      mediaFor('event-body.jpg'),
      mediaFor('svg/hero-backdrop.svg'),
    ])

  const demoProseOptions = { uploadId: demoProseImage.id }

  const mainMenu = MAIN_LINKS.map((item) => ({
    href: item.href,
    label: item.label,
    linkType: 'external' as const,
    ...(item.children?.length
      ? {
          children: item.children.map((child) => ({
            href: child.href,
            label: child.label,
            linkType: 'external' as const,
          })),
        }
      : {}),
  }))

  const contactDetails = CONTACT_BLOCKS.map((block) => ({
    title: block.title,
    ...(block.email ? { email: block.email } : {}),
    ...(block.phone ? { phone: block.phone } : {}),
    ...(block.addressLines?.length
      ? { addressLines: block.addressLines.map((line) => ({ line })) }
      : {}),
    ...(block.note ? { note: block.note } : {}),
    ...(block.links?.length
      ? { links: block.links.map((link) => ({ href: link.href, label: link.label })) }
      : {}),
    ...(block.extras?.length
      ? {
          extras: block.extras.map((value) => {
            const [label, rest] = value.split(':')
            return rest ? { label: label.trim(), value: rest.trim() } : { label: 'Údaj', value }
          }),
        }
      : {}),
  }))

  const mainSite = await upsertByField({
    collection: 'sites',
    data: {
      _status: 'published',
      accentColor: '#90d750',
      additionalColors: [
        { label: 'Fialová', value: '#bda9ff' },
        { label: 'Oranžová', value: '#ffaf53' },
        { label: 'Růžová', value: '#ff91ac' },
        { label: 'Tyrkysová', value: '#6acad9' },
        { label: 'Modrá', value: '#9fcfff' },
        { label: 'Zelená', value: '#90d750' },
        { label: 'Nerůst', value: '#5a47ff' },
        { label: 'Hnědá', value: '#c7b299' },
        { label: 'Šedá', value: '#bdccd4' },
      ],
      additionalContent: richText(
        'Jsme nezisková nevládní organizace se sídlem v Brně, která funguje od roku 2003.',
      ),
      canonicalURL: 'https://nazemi.cz',
      contactDetails,
      description:
        'Potřeby všech se dají naplnit v rámci planetárních mezí. NaZemi pracuje na hluboké a systémové transformaci společnosti.',
      donateCta,
      enabledCollections: {
        aktuality: true,
        kalendar: true,
        lide: true,
        projekty: true,
        publikace: true,
        workshopy: true,
      },
      fullAddress: richText('NaZemi, Kounicova 42, 602 00 Brno'),
      homepageBackground: heroBackdrop.id,
      logo: mainLogo.id,
      mainMenu,
      metaTitle: 'NaZemi',
      name: 'NaZemi',
      newsletters: newsletters.map((newsletter) => ({
        ...newsletter,
        subscribeLabel: 'Přihlásit se k odběru',
        subscribeUrl: 'https://nazemi.cz/newsletter/',
      })),
      primaryBackgroundColor: '#f3ffff',
      primaryColor: '#534741',
      secondaryMenu: SECONDARY_LINKS.map((link) => ({
        href: link.href,
        label: link.label,
        linkType: 'external' as const,
      })),
      sharingImage: aboutTeamImage.id,
      siteType: 'main',
      slug: 'nazemi',
      socialLinks: [
        { network: 'Facebook', url: 'https://www.facebook.com/nazemi.cz' },
        { network: 'Instagram', url: 'https://www.instagram.com/nazemi.cz/' },
      ],
    },
    field: 'slug',
    payload,
  })

  const subSite = await upsertByField({
    collection: 'sites',
    data: {
      _status: 'published',
      accentColor: '#C084FC',
      additionalColors: [{ label: 'Doplněk', value: '#F3E8FF' }],
      additionalContent: richText('Lokální aktivity NaZemi v Brně a okolí.'),
      canonicalURL: 'https://brno.nazemi.cz',
      contactDetails: [
        {
          title: 'NaZemi Brno',
          email: 'brno@nazemi.cz',
          phone: '+420 735 033 417',
          addressLines: [{ line: 'Kounicova 42' }, { line: '602 00 Brno' }],
        },
      ],
      description: 'Sub web NaZemi pro brněnské aktivity a komunitní setkání.',
      donateCta: {
        title: 'Podpořte brněnské aktivity',
        body: 'Vaše podpora pomáhá lokálním setkáním, knihovně a komunitnímu prostoru NaNebi.',
        buttonLabel: 'Podpořit přes darujme.cz',
        href: 'https://www.darujme.cz/organizace/nazemi',
      },
      enabledCollections: {
        aktuality: true,
        kalendar: true,
        lide: true,
        projekty: false,
        publikace: true,
        workshopy: true,
      },
      fullAddress: richText('NaZemi Brno, Kounicova 42, 602 00 Brno'),
      homepageBackground: heroBackdrop.id,
      logo: subLogo.id,
      mainMenu: [
        { href: '/', label: 'Domů', linkType: 'external' },
        { href: '/aktuality', label: 'Aktuality', linkType: 'external' },
        { href: '/kalendar', label: 'Kalendář', linkType: 'external' },
        { href: '/workshopy', label: 'Workshopy', linkType: 'external' },
        { href: '/publikace', label: 'Knihovna', linkType: 'external' },
        { href: '/kontakt', label: 'Kontakt', linkType: 'external' },
      ],
      metaTitle: 'NaZemi Brno',
      name: 'NaZemi Brno',
      newsletters: [
        {
          title: 'Zprávy z nebe',
          description:
            'Pošta z našeho komunitního prostoru NaNebi v Porta Coeli — akce, brigády i rozjímání.',
          subscribeLabel: 'Přihlásit se k odběru',
          subscribeUrl: 'https://nazemi.cz/newsletter/',
        },
      ],
      primaryBackgroundColor: '#FAF5FF',
      primaryColor: '#7C3AED',
      secondaryMenu: [
        { href: 'https://nazemi.cz', label: 'Hlavní web NaZemi', linkType: 'external' },
      ],
      sharingImage: brnoSharing.id,
      siteType: 'subsite',
      slug: 'brno',
      socialLinks: [{ network: 'Facebook', url: 'https://facebook.com/nazemibrno' }],
      subdomain: 'brno',
    },
    field: 'slug',
    payload,
  })

  // --------------------------------------------------------------- taxonomies
  const tagLabels = Array.from(
    new Set([
      ...calendarEvents.flatMap((event) => event.tags),
      ...newsArticles.flatMap((article) => article.tags),
      ...PUBLICATION_TOPIC_TAGS,
      ...WORKSHOP_TOPIC_TAGS,
    ]),
  )

  const tagIds = new Map<string, number | string>()
  for (const label of tagLabels) {
    const doc = await upsertByField({
      collection: 'tags',
      data: { slug: tagSlug(label), title: label },
      field: 'slug',
      payload,
    })
    tagIds.set(label, doc.id)
  }

  const publicationTypeIds = new Map<string, number | string>()
  for (const label of PUBLICATION_TYPE_TAGS) {
    const doc = await upsertByField({
      collection: 'publication-types',
      data: { slug: TYPE_FILTER_IDS[label] ?? slugifyCs(label), title: label },
      field: 'slug',
      payload,
    })
    publicationTypeIds.set(label, doc.id)
  }

  const workshopAudienceIds = new Map<string, number | string>()
  for (const label of WORKSHOP_AUDIENCE_TAGS) {
    const doc = await upsertByField({
      collection: 'workshop-audiences',
      data: { slug: AUDIENCE_FILTER_IDS[label] ?? slugifyCs(label), title: label },
      field: 'slug',
      payload,
    })
    workshopAudienceIds.set(label, doc.id)
  }

  // ----------------------------------------------------------------- projects
  const projectIds = new Map<string, number | string>()
  for (const project of projectPages) {
    const logo = await mediaFor(project.logo)
    const doc = await upsertByField({
      collection: 'projekty',
      data: {
        _status: 'published',
        content: [
          {
            blockType: 'richText' as const,
            content: await richTextFromHtml(
              project.bodyHtml ?? projectBodyHtml(project.title, project.description),
              payload,
            ),
          },
        ],
        excerpt: project.description,
        ctas: project.links.map((link) => ({
          url: link.href ?? '#',
          title: link.label,
          variant:
            link.variant === 'filled-sky' || link.variant === 'outline-ground'
              ? 'outline'
              : link.variant === 'filled-green'
                ? 'filled'
                : link.variant?.startsWith('outline')
                  ? 'outline'
                  : link.variant?.startsWith('filled')
                    ? 'filled'
                    : 'outline',
        })),
        logo: logo.id,
        logoClass: project.logoClass ?? null,
        projectColor: project.color,
        site: mainSite.id,
        slug: project.slug,
        title: project.title,
      },
      field: 'slug',
      payload,
    })
    projectIds.set(project.slug, doc.id)
  }

  // ---------------------------------------------------------------- workshops
  const workshopIds = new Map<string, number | string>()
  for (const workshop of workshops) {
    const [coverImage, speakerImages] = await Promise.all([
      mediaFor(workshop.image),
      Promise.all(
        workshop.speakers.map(async (speaker) =>
          speaker.image ? (await mediaFor(speaker.image)).id : null,
        ),
      ),
    ])

    const doc = await upsertByField({
      collection: 'workshopy',
      data: {
        _status: 'published',
        audiences: workshop.audienceTags
          .map((tag) => workshopAudienceIds.get(tag))
          .filter(Boolean),
        author: adminId,
        blocks: [
          {
            blockType: 'speakers',
            title: 'Lektoři a facilitátoři',
            people: workshop.speakers.map((speaker, index) => ({
              name: speaker.name,
              role: speaker.role,
              ...(speakerImages[index] ? { image: speakerImages[index] } : {}),
            })),
          },
          {
            blockType: 'testimonials',
            title: 'Co o workshopu říkají',
            items: workshop.testimonials.map((testimonial) => ({
              author: testimonial.author,
              quote: testimonial.quote,
              ...(testimonial.role ? { role: testimonial.role } : {}),
            })),
          },
          {
            blockType: 'richText',
            content: await richTextFromHtml(
              workshop.bodyHtml ?? `<p>${workshop.description}</p>`,
              payload,
            ),
          },
        ],
        coverImage: coverImage.id,
        ctas: [
          {
            title: workshop.orderLabel ?? 'Objednat workshop',
            url: workshop.orderUrl ?? 'mailto:workshopy@nazemi.cz',
          },
        ],
        duration: workshop.length,
        groupSize: workshop.groupSize,
        price: formatWorkshopPrice(workshop.pricing),
        excerpt: workshop.shortDescription,
        site: mainSite.id,
        slug: workshop.slug,
        takeaways: workshop.takeaways.map((item) => ({ item })),
        title: workshop.title,
        topics: workshop.topicTags.map((tag) => tagIds.get(tag)).filter(Boolean),
      },
      field: 'slug',
      payload,
    })
    workshopIds.set(workshop.slug, doc.id)
  }

  // ----------------------------------------------------------------- kalendar
  const eventIds = new Map<string, number | string>()
  const upcomingAnchors = calendarEvents
    .filter((event) => !event.past)
    .map((event) => parseCzechDate(event.date, event.time).startDate)
  const earliestUpcoming = upcomingAnchors.length
    ? Math.min(...upcomingAnchors.map((iso) => new Date(iso).getTime()))
    : Date.now()
  const upcomingShiftMs = Math.max(0, Date.now() + 7 * 24 * 60 * 60 * 1000 - earliestUpcoming)

  for (const event of calendarEvents) {
    const coverImage = await mediaFor(event.image)
    let { endDate, startDate } = parseCzechDate(event.date, event.time)
    if (!event.past && upcomingShiftMs > 0) {
      startDate = new Date(new Date(startDate).getTime() + upcomingShiftMs).toISOString()
      endDate = endDate
        ? new Date(new Date(endDate).getTime() + upcomingShiftMs).toISOString()
        : endDate
    }
    const workshopSlug = EVENT_WORKSHOP_SLUGS[event.slug]
    const bodyHtml = event.bodyHtml ?? eventBodyHtml(event)

    const doc = await upsertByField({
      collection: 'kalendar',
      data: {
        _status: 'published',
        author: adminId,
        content: await richTextFromHtml(bodyHtml, payload, demoProseOptions),
        coverImage: coverImage.id,
        ctas: event.signupUrl
          ? [{ title: event.past ? 'Podobné akce' : 'Přihlásit se', url: event.signupUrl }]
          : [],
        endDate,
        excerpt: eventExcerpt(event),
        location: {
          address: event.address ?? null,
          city: event.location,
          mapsLink: event.addressUrl ?? null,
          name: event.address?.split(',')[0] ?? 'NaZemi',
          venue: event.filters?.includes('nanebi')
            ? 'NaNebi'
            : event.filters?.includes('flow-makers')
              ? 'Flow Makers'
              : null,
        },
        showOnMainSite: false,
        site: mainSite.id,
        slug: event.slug,
        startDate,
        tags: event.tags.map((tag) => tagIds.get(tag)).filter(Boolean),
        title: event.title,
        ...(workshopSlug && workshopIds.get(workshopSlug)
          ? { workshop: workshopIds.get(workshopSlug) }
          : {}),
      },
      field: 'slug',
      payload,
    })
    eventIds.set(event.slug, doc.id)
  }

  // ---------------------------------------------------------------- aktuality
  const newsIds = new Map<string, number | string>()
  for (const article of newsArticles) {
    const coverImage = await mediaFor(article.image)
    const { startDate } = parseCzechDate(article.date, '9:00')
    const bodyHtml = article.bodyHtml ?? newsBodyHtml(article)

    const doc = await upsertByField({
      collection: 'aktuality',
      data: {
        _status: 'published',
        author: adminId,
        authorName: article.author,
        content: await richTextFromHtml(bodyHtml, payload),
        coverImage: coverImage.id,
        excerpt: newsExcerpt(article),
        layout: article.layout,
        publishedAt: startDate,
        showOnMainSite: false,
        site: mainSite.id,
        slug: article.slug,
        tags: article.tags.map((tag) => tagIds.get(tag)).filter(Boolean),
        title: article.title,
      },
      field: 'slug',
      payload,
    })
    newsIds.set(article.slug, doc.id)
  }

  // ---------------------------------------------------------------- publikace
  for (const publication of publications) {
    const coverImage = await mediaFor(publication.cover, `Obálka publikace ${publication.title}`)

    await upsertByField({
      collection: 'publikace',
      data: {
        _status: 'published',
        author: adminId,
        authorName: publication.author,
        content: await richTextFromHtml(publication.bodyHtml, payload),
        coverImage: coverImage.id,
        ctas:
          publication.buyUrl || publication.buyLabel
            ? [
                {
                  title: publication.buyLabel || 'Kde koupit',
                  url: publication.buyUrl || 'https://www.kosmas.cz',
                },
              ]
            : [],
        excerpt: publication.description,
        showOnMainSite: false,
        site: mainSite.id,
        slug: publication.slug,
        title: publication.title,
        topics: publication.topicTags.map((tag) => tagIds.get(tag)).filter(Boolean),
        types: publication.typeTags.map((tag) => publicationTypeIds.get(tag)).filter(Boolean),
      },
      field: 'slug',
      payload,
    })
  }

  // -------------------------------------------------------------------- lidé
  for (const [index, member] of teamMembers.entries()) {
    const image = member.image ? await mediaFor(member.image, `Portrét ${member.name}`) : null

    await upsertByField({
      collection: 'lide',
      data: {
        _status: 'published',
        ...(member.email ? { email: member.email } : {}),
        ...(image ? { image: image.id } : {}),
        name: member.name,
        ...(member.phone ? { phone: member.phone } : {}),
        role: member.role,
        site: mainSite.id,
        slug: slugifyCs(member.name),
        sortOrder: index + 1,
      },
      field: 'slug',
      payload,
    })
  }

  // ----------------------------------------------------------- homepage (main)
  await upsertByField({
    collection: 'stranky',
    data: {
      _status: 'published',
      description:
        'Potřeby všech se dají naplnit v rámci planetárních mezí. Vítejte na webu NaZemi.',
      homepageContent: [
        {
          blockType: 'hero',
          segments: hero.segments.map((segment) => ({
            text: segment.text,
            underline: segment.underline,
          })),
          subheadline: hero.subheadline,
        },
        {
          actions: [
            { href: '/kalendar', label: 'Všechny události', variant: 'outline' },
          ],
          blockType: 'events',
          items: featuredEvents.map((event) => eventIds.get(event.slug)).filter(Boolean),
          limit: 3,
          selection: 'manual',
          title: 'Co se děje v NaZemi',
        },
        {
          actions: pillarsActions,
          blockType: 'pillars',
          pillars: pillars.map((pillar) => ({
            body: pillar.body,
            buttonLabel: pillar.buttonLabel,
            color: pillar.color,
            href: PILLAR_HREFS[pillar.title] ?? '/o-nazemi',
            title: pillar.title,
          })),
          title: 'O co nám jde',
        },
        {
          actions: [
            { href: '/aktuality', label: 'Všechny aktuality', variant: 'outline' },
          ],
          blockType: 'news',
          items: featuredNews.map((article) => newsIds.get(article.slug)).filter(Boolean),
          limit: 4,
          selection: 'manual',
          title: 'Aktuality',
        },
        {
          blockType: 'projects',
          items: projectPages
            .map((project) => projectIds.get(project.slug))
            .filter(Boolean),
          title: 'Naše projekty',
        },
        {
          actions: [
            { href: '/o-nazemi', label: 'Číst o NaZemi', variant: 'outline' },
          ],
          blockType: 'about',
          columns: about.columns.map((column) => ({ body: column.body, title: column.title })),
          image: aboutTeamImage.id,
          title: 'NaZemi',
        },
      ],
      isHomepage: true,
      site: mainSite.id,
      slug: 'home',
      title: 'Domů',
    },
    field: 'slug',
    payload,
  })

  // ------------------------------------------------------------ generic pages
  const galleryMedia = await Promise.all([
    mediaFor('about-team.jpg'),
    mediaFor('news-1.jpg'),
    mediaFor('news-2.jpg'),
    mediaFor('news-3.jpg'),
    mediaFor('news-4.jpg'),
    mediaFor('event-1.jpg'),
  ])
  const g = galleryMedia.map((m) => m.id)

  for (const page of genericPages) {
    const coverImage = page.coverImage ? await mediaFor(page.coverImage) : null
    const bodyHtml = page.bodyHtml ?? genericPageBodyHtml(page.title, page.description)
    const gallerySamples =
      page.slug === 'o-nazemi'
        ? [
            {
              blockType: 'gallery' as const,
              images: [g[0]],
              caption: 'Ukázka: 1 obrázek',
            },
            {
              blockType: 'gallery' as const,
              images: g.slice(0, 2),
              columns: '2' as const,
              caption: 'Ukázka: 2 obrázky (2 sloupce)',
            },
            {
              blockType: 'gallery' as const,
              images: g.slice(0, 3),
              columns: '3' as const,
              caption: 'Ukázka: 3 obrázky (3 sloupce)',
            },
            {
              blockType: 'gallery' as const,
              images: g.slice(0, 5),
              columns: '2' as const,
              caption: 'Ukázka: 5 obrázků (2 sloupce)',
            },
          ]
        : []

    await upsertByField({
      collection: 'stranky',
      data: {
        _status: 'published',
        content: [
          {
            blockType: 'richText',
            content: await richTextFromHtml(bodyHtml, payload, demoProseOptions),
          },
          ...gallerySamples,
        ],
        ...(coverImage ? { coverImage: coverImage.id } : {}),
        description: page.description,
        excerpt: page.description,
        headerColor: page.headerColor,
        isHomepage: false,
        site: mainSite.id,
        slug: page.slug,
        title: page.title,
      },
      field: 'slug',
      payload,
    })
  }

  // ------------------------------------------------------------ subsite (Brno)
  const [brnoEventImage, brnoNewsImage] = await Promise.all([
    mediaFor('event-3.jpg'),
    mediaFor('news-3.jpg'),
  ])

  await upsertByField({
    collection: 'stranky',
    data: {
      _status: 'published',
      description: 'Domovská stránka brněnského sub webu NaZemi.',
      homepageContent: [
        {
          blockType: 'hero',
          segments: [
            { text: 'NaZemi v Brně', underline: 'violet' },
            { text: ' — komunitní prostor, knihovna a setkání.', underline: 'none' },
          ],
          subheadline:
            'Lokální aktivity, otevřené workshopy a knihovna NaZemi na Kounicově 42 v Brně.',
        },
        {
          actions: [{ href: '/kalendar', label: 'Všechny události', variant: 'outline' }],
          blockType: 'events',
          limit: 3,
          selection: 'auto',
          title: 'Co se děje v Brně',
        },
        {
          actions: [{ href: '/aktuality', label: 'Všechny aktuality', variant: 'outline' }],
          blockType: 'news',
          limit: 4,
          selection: 'auto',
          title: 'Aktuality z Brna',
        },
      ],
      isHomepage: true,
      site: subSite.id,
      slug: 'home',
      title: 'Domů',
    },
    field: 'slug',
    payload,
  })

  await upsertByField({
    collection: 'aktuality',
    data: {
      _status: 'published',
      author: adminId,
      authorName: 'NaZemi Brno',
      content: await richTextFromHtml(
        `<p>Knihovna NaZemi na Kounicově 42 rozšiřuje otevírací dobu a zve na komunitní čtení.</p>
<h2>Co se v Brně chystá</h2>
<ul>
  <li>Otevřená knihovna v úterý a ve čtvrtek odpoledne</li>
  <li>Komunitní čtení nad tématem nerůstu</li>
  <li>Sousedské setkání v prostoru NaNebi</li>
</ul>`,
        payload,
      ),
      coverImage: brnoNewsImage.id,
      excerpt:
        'Knihovna NaZemi rozšiřuje otevírací dobu a zve na komunitní čtení a sousedská setkání.',
      layout: 'small',
      publishedAt: parseCzechDate('20. 7. 2026', '9:00').startDate,
      showOnMainSite: true,
      site: subSite.id,
      slug: 'brno-zve-na-setkani',
      tags: [tagIds.get('Komunita')].filter(Boolean),
      title: 'Brno zve na komunitní setkání v knihovně',
    },
    field: 'slug',
    payload,
  })

  await upsertByField({
    collection: 'kalendar',
    data: {
      _status: 'published',
      author: adminId,
      content: await richTextFromHtml(
        `<h2>Otevřený workshop v Brně</h2>
<p>Otevřený běh workshopu Nenásilná komunikace pro učitele a učitelky v prostoru NaNebi na Kounicově 42.</p>
<ul>
  <li>Termín: 24. 9. 2026, 9:00 – 17:00</li>
  <li>Místo: NaNebi, Kounicova 42, Brno</li>
  <li>Kapacita 20 účastníků</li>
</ul>`,
        payload,
      ),
      coverImage: brnoEventImage.id,
      ctas: [{ title: 'Přihlásit se', url: 'https://darujme.cz' }],
      excerpt: '24. 9. 2026, 9:00 – 17:00 — Brno. Workshop, Nenásilná komunikace.',
      location: {
        address: 'NaNebi, Kounicova 42, 602 00, Brno',
        city: 'Brno',
        mapsLink: 'https://maps.google.com/?q=NaNebi+Kounicova+42+Brno',
        name: 'NaNebi',
      },
      showOnMainSite: true,
      site: subSite.id,
      slug: 'brnensky-otevreny-workshop',
      startDate: parseCzechDate('24. 9. 2026', '9:00 – 17:00').startDate,
      endDate: parseCzechDate('24. 9. 2026', '9:00 – 17:00').endDate,
      tags: [tagIds.get('Workshop'), tagIds.get('Nenásilná komunikace')].filter(Boolean),
      title: 'Brněnský otevřený workshop nenásilné komunikace',
      ...(workshopIds.get('nenasilna-komunikace')
        ? { workshop: workshopIds.get('nenasilna-komunikace') }
        : {}),
    },
    field: 'slug',
    payload,
  })

  // ------------------------------------------------------- legacy demo cleanup
  for (const { collection, slugs } of LEGACY_DOCS) {
    for (const slug of slugs) {
      await payload.delete({
        collection,
        overrideAccess: true,
        where: { slug: { equals: slug } },
      })
    }
  }

  payload.logger.info(
    `Seed completed. Weby: 2, projekty: ${projectPages.length}, workshopy: ${workshops.length}, události: ${calendarEvents.length + 1}, aktuality: ${newsArticles.length + 1}, publikace: ${publications.length}, lidé: ${teamMembers.length}, stránky: ${genericPages.length + 2}.`,
  )
  process.exit(0)
}

void seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
