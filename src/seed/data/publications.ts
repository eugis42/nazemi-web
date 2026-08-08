/** Ported from nazemi-design `src/data/publications.js`. Covers are paths under `public/seed/`. */
export const BOOK_PLACEHOLDER_COVERS = [
  'book-placeholder-1.svg',
  'book-placeholder-2.svg',
  'book-placeholder-3.svg',
  'book-placeholder-4.svg',
  'book-placeholder-5.svg',
  'book-placeholder-6.svg',
]

export type PublicationSeed = {
  slug: string
  title: string
  author: string
  description: string
  typeTags: string[]
  topicTags: string[]
  buyUrl?: string
  buyLabel?: string
  bodyHtml?: string
}

export const PUBLICATION_TYPE_TAGS = ['Kniha', 'Časopis', 'Metodika', 'Studie']

export const PUBLICATION_TOPIC_TAGS = [
  'Klima',
  'Konflikty',
  'Práce',
  'Spotřeba',
  'Nerůst',
  'Nerovnosti',
  'Sebeřízení',
  'Vzdělávání',
  'Občanská společnost',
]

export const TYPE_FILTER_IDS: Record<string, string> = {
  Kniha: 'kniha',
  Časopis: 'casopis',
  Metodika: 'metodika',
  Studie: 'studie',
}

export const TOPIC_FILTER_IDS: Record<string, string> = {
  Klima: 'klima',
  Konflikty: 'konflikty',
  Práce: 'prace',
  Spotřeba: 'spotreba',
  Nerůst: 'nerust',
  Nerovnosti: 'nerovnosti',
  Sebeřízení: 'seberizeni',
  Vzdělávání: 'vzdelavani',
  'Občanská společnost': 'obcanska-spolecnost',
}

function buildPublicationFilters(typeTags: string[], topicTags: string[]) {
  return [
    ...typeTags.map((tag) => TYPE_FILTER_IDS[tag]),
    ...topicTags.map((tag) => TOPIC_FILTER_IDS[tag]),
  ].filter(Boolean)
}

export const PUBLICATION_FILTER_GROUPS = [
  [{ id: 'all', label: 'Všechny publikace', kind: 'all' }],
  PUBLICATION_TYPE_TAGS.map((label) => ({
    id: TYPE_FILTER_IDS[label],
    label,
  })),
  PUBLICATION_TOPIC_TAGS.map((label) => ({
    id: TOPIC_FILTER_IDS[label],
    label,
  })),
]

export const PUBLICATIONS_PER_PAGE = 16

export function getPublicationListingHref(filterId?: string) {
  if (!filterId) return '/publikace'
  return `/publikace?filter=${encodeURIComponent(filterId)}`
}

export function getPublicationHref(slug: string) {
  return `/publikace/${slug}`
}

export function getPublicationBySlug(slug: string) {
  return publications.find((publication) => publication.slug === slug) ?? null
}

function coverForIndex(index: number) {
  return BOOK_PLACEHOLDER_COVERS[index % BOOK_PLACEHOLDER_COVERS.length]
}

const publicationSeed: PublicationSeed[] = [
  {
    slug: 'vrchol-je-dno',
    title: 'Vrchol je dno',
    author: 'Tadeáš Žďárský',
    description:
      'Kniha o nerůstu, planetárních mezích a představivosti jiných ekonomik. Základní text českého hnutí za nerůst.',
    typeTags: ['Kniha'],
    topicTags: ['Nerůst', 'Spotřeba'],
    buyUrl: 'https://www.kosmas.cz',
    buyLabel: 'Koupit u Kosmasu',
    bodyHtml: `<h2>O knize</h2>
<p><em>Vrchol je dno</em> je jedním z nejdůležitějších českých textů o nerůstu a planetárních mezích. Tadeáš Žďárský v něm propojuje ekonomickou teorii, ekologii a politickou představivost — bez zjednodušování a bez apokalyptického tónu.</p>
<p>Kniha vznikla v kontextu českého hnutí za nerůst a rychle se stala referenčním textem pro pedagogy, aktivisty i politiky, kteří hledají jazyk pro diskusi o limitech růstu.</p>

<h3>Pro koho je určena</h3>
<ul>
  <li>Pedagogové a studenti transformativního vzdělávání</li>
  <li>Aktivisté a občanské iniciativy</li>
  <li>Každý, kdo chce pochopit argumenty hnutí za nerůst</li>
</ul>

<blockquote>
  <p>„Nerůst není pesimismus. Je to odmítnutí představy, že jedinou možností je stále víc — a hledání cesty, jak žít dobře uvnitř planetárních mezí."</p>
</blockquote>

<h3>Obsah knihy</h3>
<ol>
  <li>Proč růst naráží na limity</li>
  <li>Planetární meze a jejich překračování</li>
  <li>Politiky nerůstu a degrowthu</li>
  <li>Představivost jiných ekonomik</li>
  <li>Cesta vpřed — prakticky i politicky</li>
</ol>

<p>Více informací o autorovi a knize najdete na <a href="https://nazemi.cz">webu NaZemi</a>.</p>`,
  },
  {
    slug: 'nenasilna-komunikace-v-skole',
    title: 'Nenásilná komunikace ve škole',
    author: 'Petra Svobodová',
    description:
      'Praktická metodika pro pedagogy, kteří chtějí vést třídu s respektem a jasností — bez sankcí a bez ztráty autority.',
    typeTags: ['Metodika'],
    topicTags: ['Konflikty', 'Vzdělávání'],
  },
  {
    slug: 'globalka',
    title: 'Globálka',
    author: 'Člověk v tísni',
    description:
      'Časopis o globálních tématech pro školy a neformální vzdělávání. Každé číslo mapuje jedno velké téma současnosti.',
    typeTags: ['Časopis'],
    topicTags: ['Nerovnosti', 'Klima', 'Vzdělávání'],
  },
  {
    slug: 'seberizeni-pruvodce',
    title: 'Sebeřízení: průvodce pro organizace',
    author: 'Klára Horáková',
    description:
      'Jak budovat pracovní prostředí bez hierarchie, kde mají lidé hlas a práce má smysl. Zkušenosti z české praxe.',
    typeTags: ['Kniha'],
    topicTags: ['Sebeřízení', 'Práce'],
  },
  {
    slug: 'klima-a-spravedlnost',
    title: 'Klima a spravedlnost',
    author: 'Marie Nováková',
    description:
      'Studie propojující klimatickou krizi s nerovnostmi v globálním Jihu i na severu. S doporučeními pro vzdělávání.',
    typeTags: ['Studie'],
    topicTags: ['Klima', 'Nerovnosti'],
  },
  {
    slug: 'facilitace-v-komunitach',
    title: 'Facilitace v komunitách',
    author: 'Tomáš Černý',
    description:
      'Metodický list o vedení setkání, rozhodování bez hlasování a péči o skupinovou dynamiku v občanských iniciativách.',
    typeTags: ['Metodika'],
    topicTags: ['Občanská společnost', 'Sebeřízení'],
  },
  {
    slug: 'odpor-bez-nasili',
    title: 'Odpor bez násilí',
    author: 'Gene Sharp',
    description:
      'Klasický přehled 198 metod nenásilného odporu. Přeložený text pro aktivisty, pedagogy a všechny, kdo chtějí měnit svět.',
    typeTags: ['Kniha'],
    topicTags: ['Konflikty', 'Občanská společnost'],
  },
  {
    slug: 'transformativni-vzdelavani',
    title: 'Transformativní vzdělávání v praxi',
    author: 'NaZemi',
    description:
      'Soubor článků a případových studií z českých škol a neziskovek, které experimentují s proměnou vzdělávání.',
    typeTags: ['Studie'],
    topicTags: ['Vzdělávání', 'Nerovnosti'],
  },
  {
    slug: 'udrzitelna-spotreba',
    title: 'Udržitelná spotřeba',
    author: 'Jan Dvořák',
    description:
      'Kniha o tom, jak přejít od konzumního životního stylu k promyšlené spotřebě — včetně cvičení pro skupiny i jednotlivce.',
    typeTags: ['Kniha'],
    topicTags: ['Spotřeba', 'Nerůst'],
  },
  {
    slug: 'revue-nerust',
    title: 'Revue Nerůst',
    author: 'Hnutí za nerůst',
    description:
      'Čtvrtletní časopis s rozhovory, esejemi a reportážemi z Česka i zahraničí o alternativách k růstové logice.',
    typeTags: ['Časopis'],
    topicTags: ['Nerůst'],
  },
  {
    slug: 'prace-bez-bosu',
    title: 'Práce bez šéfa',
    author: 'David Kučera',
    description:
      'Příběhy českých firem a neziskovek, které zkoušejí sebeřízení, holokracii a participativní rozhodování.',
    typeTags: ['Kniha'],
    topicTags: ['Práce', 'Sebeřízení'],
  },
  {
    slug: 'obcanska-odolnost-prirucka',
    title: 'Občanská odolnost: příručka pro iniciativy',
    author: 'NaZemi',
    description:
      'Metodika pro komunity a aktivisty — od plánování akcí přes péči o tým až po komunikaci s médii a úřady.',
    typeTags: ['Metodika'],
    topicTags: ['Občanská společnost', 'Konflikty'],
  },
  {
    slug: 'planetarni-meze',
    title: 'Planetární meze',
    author: 'Johan Rockström',
    description:
      'Přehled vědeckých hranic, které nesmíme překročit, pokud chceme udržet stabilní planetu pro lidskou civilizaci.',
    typeTags: ['Kniha'],
    topicTags: ['Klima', 'Nerůst'],
  },
  {
    slug: 'nerovnosti-v-cesku',
    title: 'Nerovnosti v Česku',
    author: 'Český helsinský výbor',
    description:
      'Studie mapující sociální a ekonomické nerovnosti v české společnosti s doporučeními pro vzdělávání a politiku.',
    typeTags: ['Studie'],
    topicTags: ['Nerovnosti'],
  },
  {
    slug: 'globani-metodika',
    title: 'Globální témata ve výuce',
    author: 'NaZemi',
    description:
      'Metodická příručka pro učitele ZŠ a SŠ — aktivity, scénáře hodin a tipy pro práci s kontroverzními tématy.',
    typeTags: ['Metodika'],
    topicTags: ['Vzdělávání', 'Nerovnosti', 'Klima'],
  },
  {
    slug: 'ekonomie-spoluprace',
    title: 'Ekonomie spolupráce',
    author: 'Eva Procházková',
    description:
      'Kniha o kooperativách, komunitních podnicích a jiných formách hospodaření, které staví na spolupráci místo soutěže.',
    typeTags: ['Kniha'],
    topicTags: ['Práce', 'Nerůst'],
  },
]

export const publications = publicationSeed.map((publication, index) => ({
  ...publication,
  cover: coverForIndex(index),
  filters: buildPublicationFilters(publication.typeTags, publication.topicTags),
  buyUrl: publication.buyUrl ?? 'https://www.kosmas.cz',
  buyLabel: publication.buyLabel ?? 'Kde koupit',
  bodyHtml:
    publication.bodyHtml ??
    `<h2>O publikaci</h2>
<p>${publication.description}</p>
<p>Podrobnější informace o obsahu, autorech a doporučeném využití publikace doplníme v knihovně NaZemi.</p>`,
  href: getPublicationHref(publication.slug),
}))
