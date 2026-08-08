/**
 * Ported from nazemi-design `src/data/navigation.js`.
 * Design routes (`./stranka.html?slug=x`) are mapped to Payload frontend paths.
 */
export type NavItem = {
  label: string
  href: string
  external?: boolean
  children?: NavItem[]
}

export const MAIN_LINKS: NavItem[] = [
  { label: 'Domů', href: '/' },
  { label: 'Kalendář', href: '/kalendar' },
  { label: 'Aktuality', href: '/aktuality' },
  {
    label: 'Projekty',
    href: '/projekty',
    children: [
      { label: 'Nerůst', href: '/projekty/nerust' },
      { label: 'Flow Makers', href: '/projekty/flow-makers' },
      { label: 'NaNebi', href: '/projekty/nanebi' },
      { label: 'Generace Symbiocén', href: '/projekty/generace-symbiocen' },
    ],
  },
  {
    label: 'Vzdělávání',
    href: '/vzdelavani',
    children: [
      { label: 'Témata', href: '/vzdelavani-temata' },
      { label: 'Metodiky', href: '/publikace?filter=metodika' },
      { label: 'Publikace', href: '/publikace' },
    ],
  },
  { label: 'Workshopy', href: '/workshopy' },
  {
    label: 'O NaZemi',
    href: '/o-nazemi',
    children: [
      { label: 'Proč existuje NaZemi', href: '/proc-existuje-nazemi' },
      { label: 'Kdo stojí za NaZemi', href: '/kdo-stoji-za-nazemi' },
      { label: 'Výroční zprávy', href: '/vyrocni-zpravy' },
    ],
  },
  {
    label: 'Knihovna',
    href: '/knihovna-nazemi',
    children: [
      { label: 'Knihovna NaZemi', href: '/knihovna-nazemi' },
      { label: 'Publikace', href: '/publikace' },
    ],
  },
  { label: 'Kontakt', href: '/kontakt' },
]

export const SECONDARY_LINKS: NavItem[] = [
  { label: 'Podpořte NaZemi', href: 'https://www.darujme.cz/organizace/nazemi', external: true },
  { label: 'E-Shop', href: 'https://nazemi.cz/obchod/', external: true },
]
