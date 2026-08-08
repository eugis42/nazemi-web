/** Ported from nazemi-design `src/data/news.js`. Images are paths under `public/seed/`. */
const news1 = 'news-1.jpg'
const news2 = 'news-2.jpg'
const news3 = 'news-3.jpg'
const news4 = 'news-4.jpg'
const event1 = 'event-1.jpg'
const event2 = 'event-2.jpg'
const event3 = 'event-3.jpg'

export function getNewsHref(slug: string) {
  return `/aktuality/${slug}`
}

export function getNewsBySlug(slug: string) {
  return newsArticles.find((article) => article.slug === slug) ?? null
}

function layoutForSlug(slug: string): 'big' | 'small' {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return hash % 2 === 0 ? 'big' : 'small'
}

export type NewsArticleSeed = {
  slug: string
  image: string
  date: string
  author: string
  tags: string[]
  source?: string
  external?: boolean
  title: string
  buttonLabel?: string
  filters: string[]
  past?: boolean
  bodyHtml?: string
}

const newsArticleSeed: NewsArticleSeed[] = [
  {
    slug: 'vrchol-je-dno-nova-kniha',
    image: news1,
    date: '16. 6. 2026',
    author: 'Tadeáš Žďárský',
    tags: ['Nerůst', 'Budoucnost'],
    source: 'NaNebi',
    title: 'Vrchol je dno: nová kniha z dílny Nerůstu je venku!',
    buttonLabel: 'Přečíst článek',
    filters: ['nerust', 'nanebi'],
  },
  {
    slug: 'novy-web-jo',
    image: news2,
    date: '16. 6. 2026',
    author: 'Marie Nováková',
    tags: ['Budoucnost'],
    title: 'Nový web! JO!',
    buttonLabel: 'Přečíst článek',
    filters: ['budoucnost'],
  },
  {
    slug: 'nanebi-oslavuje-vyroci',
    image: news3,
    date: '16. 6. 2026',
    author: 'Jan Dvořák',
    tags: ['Budoucnost'],
    source: 'NaNebi',
    title: 'NaNebi oslavuje výročí. Co se nám za 5 let povedlo?',
    buttonLabel: 'Přečíst článek',
    filters: ['nanebi'],
  },
  {
    slug: 'navlne-facilitace-seberizeni',
    image: news4,
    date: '16. 6. 2026',
    author: 'Klára Horáková',
    tags: ['Workshop', 'Budoucnost'],
    source: 'Flow Makers',
    title: 'Přivítejte náš projekt NaVlně - učíme firmy umění facilitace a sebeřízení.',
    buttonLabel: 'Přečíst článek',
    filters: ['workshop', 'flow-makers'],
  },
  {
    slug: 'nerustova-akademie-2026-reportaz',
    image: event2,
    date: '18. 6. 2026',
    author: 'Tadeáš Žďárský',
    tags: ['Akademie', 'Nerůst', 'Budoucnost'],
    title: 'Nerůstová akademie 2026 — reportáž z příprav',
    buttonLabel: 'Přečíst článek',
    filters: ['akademie', 'nerust'],
  },
  {
    slug: 'nenasilna-komunikace-v-praxi',
    image: event1,
    date: '20. 6. 2026',
    author: 'Petra Svobodová',
    tags: ['Workshop', 'Nenásilná komunikace'],
    title: 'Nenásilná komunikace v praxi: co si účastníci odnesli',
    buttonLabel: 'Přečíst článek',
    filters: ['workshop', 'nenasilna-komunikace'],
  },
  {
    slug: 'protest-u-ministerstva',
    image: event3,
    date: '2. 7. 2026',
    author: 'Tomáš Černý',
    tags: ['Protest'],
    title: 'Protest u ministerstva: proč jsme se sešli',
    buttonLabel: 'Přečíst článek',
    filters: ['protest'],
  },
  {
    slug: 'letni-brigada-porta-coeli',
    image: news1,
    date: '5. 7. 2026',
    author: 'Tadeáš Žďárský',
    tags: ['Budoucnost'],
    source: 'NaNebi',
    title: 'Letní brigáda v Porta Coeli — přihlášky otevřené',
    buttonLabel: 'Přečíst článek',
    filters: ['nanebi', 'budoucnost'],
  },
  {
    slug: 'transformativni-vzdelavani-ve-skolach',
    image: news2,
    date: '12. 7. 2026',
    author: 'Marie Nováková',
    tags: ['Workshop', 'Budoucnost'],
    title: 'Jak vypadá transformativní vzdělávání v českých školách',
    buttonLabel: 'Přečíst článek',
    filters: ['workshop', 'budoucnost'],
  },
  {
    slug: 'facilitace-v-organizacich-navlne',
    image: news3,
    date: '20. 7. 2026',
    author: 'Klára Horáková',
    tags: ['Workshop'],
    source: 'Flow Makers',
    title: 'Facilitace v organizacích: nový kurz NaVlně',
    buttonLabel: 'Přečíst článek',
    filters: ['workshop', 'flow-makers'],
  },
  {
    slug: 'planetarni-meze-a-nerust',
    image: news4,
    date: '1. 8. 2026',
    author: 'Tadeáš Žďárský',
    tags: ['Nerůst', 'Akademie'],
    title: 'Planetární meze a nerůst: shrnutí diskuse',
    buttonLabel: 'Přečíst článek',
    filters: ['nerust', 'akademie'],
  },
  {
    slug: 'obcanska-neposlusnost-jako-nastroj',
    image: event1,
    date: '10. 8. 2026',
    author: 'Tomáš Černý',
    tags: ['Protest', 'Nenásilná komunikace'],
    title: 'Občanská neposlušnost jako nástroj změny',
    buttonLabel: 'Přečíst článek',
    filters: ['protest', 'nenasilna-komunikace'],
  },
]

export const newsArticles = newsArticleSeed.map((article) => ({
  ...article,
  layout: layoutForSlug(article.slug),
  href: getNewsHref(article.slug),
}))

export const NEWS_FILTER_GROUPS = [
  [{ id: 'all', label: 'Všechny aktuality', kind: 'all' }],
  [
    { id: 'workshop', label: 'Workshop' },
    { id: 'nenasilna-komunikace', label: 'Nenásilná komunikace' },
    { id: 'nerust', label: 'Nerůst' },
    { id: 'akademie', label: 'Akademie' },
    { id: 'budoucnost', label: 'Budoucnost' },
    { id: 'protest', label: 'Protest' },
  ],
  [
    { id: 'nanebi', label: 'NaNebi', external: true },
    { id: 'flow-makers', label: 'Flow Makers', external: true },
  ],
]

export const NEWS_PER_PAGE = 9

/** Homepage teaser — first four articles */
export const featuredNews = newsArticles.slice(0, 4)
