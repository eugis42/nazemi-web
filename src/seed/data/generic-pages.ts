/** Ported from nazemi-design `src/data/generic-pages.js`. Images are paths under `public/seed/`. */
const aboutTeam = 'about-team.jpg'
const news2 = 'news-2.jpg'

export type PageHeaderColor =
  | 'sky'
  | 'green'
  | 'violet'
  | 'orange'
  | 'turquoise'
  | 'blue'
  | 'nerust'
  | 'pink'
  | 'brown'
  | 'gray'

export type GenericPageSeed = {
  slug: string
  title: string
  description: string
  activeNav: 'education' | 'about' | 'library'
  headerColor: PageHeaderColor
  coverImage?: string
  bodyHtml?: string
}

export function getGenericPageHref(slug: string) {
  return `/${slug}`
}

export function getGenericPageBySlug(slug: string) {
  return genericPages.find((page) => page.slug === slug) ?? null
}

export const genericPages: (GenericPageSeed & { href: string })[] = ([
  {
    slug: 'vzdelavani',
    title: 'Vzdělávání',
    description:
      'Na školách i v neformálním prostředí rozvíjíme vzdělávání, které může přispět k hluboké proměně nás samých i našich společenství směrem k vizi dobrého života pro všechny v rámci limitů planety.',
    activeNav: 'education',
    headerColor: 'violet',
  },
  {
    slug: 'vzdelavani-temata',
    title: 'Témata',
    description:
      'Přehled hlavních vzdělávacích témat, kterým se v NaZemi věnujeme — od globální rozvojové výchovy po transformativní pedagogiku a nerůst.',
    activeNav: 'education',
    headerColor: 'orange',
  },
  {
    slug: 'vzdelavani-metodiky',
    title: 'Metodiky',
    description:
      'Praktické metodiky a návody pro učitele, pedagogy a facilitátory, kteří chtějí propojit teorii s každodenní praxí ve třídě i mimo ni.',
    activeNav: 'education',
    headerColor: 'turquoise',
    coverImage: news2,
  },
  {
    slug: 'vzdelavani-publikace',
    title: 'Publikace',
    description:
      'Články, studie a další publikace z oblasti globálního, kritického a transformativního vzdělávání, které vznikly v NaZemi nebo s naší účastí.',
    activeNav: 'education',
    headerColor: 'green',
  },
  {
    slug: 'o-nazemi',
    title: 'O NaZemi',
    description:
      'Jsme nezisková nevládní organizace se sídlem v Brně, která funguje od roku 2003. Naší vizí je solidární globální společnost usilující o prospěch lidského i mimolidského světa.',
    activeNav: 'about',
    headerColor: 'brown',
  },
  {
    slug: 'proc-existuje-nazemi',
    title: 'Proč existuje NaZemi',
    description:
      'NaZemi vzniklo z přesvědčení, že jiný svět je dosažitelný — a že vzdělávání, ekonomika a fungování organizací mohou přispět k naplnění potřeb všech v rámci planetárních mezí.',
    activeNav: 'about',
    headerColor: 'nerust',
  },
  {
    slug: 'kdo-stoji-za-nazemi',
    title: 'Kdo stojí za NaZemi',
    description:
      'Za NaZemi stojí tým lidí, kteří společně tvoří sebeřízenou organizaci založenou na principech nenásilí, spolupráce a péče.',
    activeNav: 'about',
    headerColor: 'blue',
    coverImage: aboutTeam,
  },
  {
    slug: 'vyrocni-zpravy',
    title: 'Výroční zprávy',
    description:
      'Archiv výročních zpráv NaZemi — přehled našich aktivit, projektů a hospodaření za jednotlivé roky.',
    activeNav: 'about',
    headerColor: 'pink',
  },
  {
    slug: 'knihovna-nazemi',
    title: 'Knihovna NaZemi',
    description:
      'Místo, kde najdete knihy, časopisy a materiály o globálním rozvoji, nerůstu, transformativním vzdělávání a občanské společnosti — k zapůjčení i ke studiu na místě.',
    activeNav: 'library',
    headerColor: 'brown',
    bodyHtml: `<h2>O knihovně</h2>
<p>Knihovna NaZemi sídlí v prostorách NaNebi v Brně a je otevřená všem, kdo se chtějí hlouběji zabývat tématy globální spravedlnosti, udržitelnosti a sociálních změn. Nabízíme přes 2 000 titulů v češtině i v angličtině.</p>
<p>Knihovnu provozujeme jako komunitní prostor — můžete u nás číst, pracovat nebo si materiály odnést domů. Všechny výtěžky z případných poplatků investujeme do rozšiřování fondu a údržby prostor.</p>

<h3>Co u nás najdete</h3>
<ul>
  <li>Beletrii i odbornou literaturu o globálním rozvoji a environmentálních tématech</li>
  <li>Časopisy a zpravodaje českých i zahraničních organizací</li>
  <li>Metodické materiály pro učitele a lektory</li>
  <li>Výtisky publikací vydaných NaZemi a partnery</li>
</ul>

<h3>Jak si půjčit knihu</h3>
<ol>
  <li>Zaregistrujte se u knihovníka — stačí jednorázově vyplnit formulář na místě</li>
  <li>Vyberte titul v <a href="#">online katalogu</a> nebo přímo ve skladu knihovny</li>
  <li>Výpůjčka je na 30 dní s možností prodloužení e-mailem</li>
</ol>

<h3>Otevírací doba</h3>
<dl>
  <dt>Úterý a čtvrtek</dt>
  <dd>14:00 – 18:00</dd>
  <dt>Středa</dt>
  <dd>10:00 – 16:00</dd>
  <dt>Sobota</dt>
  <dd>10:00 – 14:00 (1× měsíčně — sledujte <a href="./aktuality.html">aktuality</a>)</dd>
</dl>

<blockquote>
  <p>Knihovna není jen o knihách. Je to místo, kde se potkávají lidé, kteří chtějí přemýšlet o světě jinak.</p>
</blockquote>

<p>Adresa: NaNebi, Kounicova 42, 602 00 Brno. Dotazy pište na <a href="mailto:knihovna@nazemi.cz">knihovna@nazemi.cz</a>.</p>`,
  },
] as GenericPageSeed[]).map((page) => ({
  ...page,
  href: getGenericPageHref(page.slug),
}))
