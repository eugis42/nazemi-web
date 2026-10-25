/** Legal / footer-menu pages shared by seed + ensure script. */
export const FOOTER_LEGAL_PAGES = [
  {
    slug: 'ochrana-osobnich-udaju',
    title: 'Ochrana osobních údajů',
  },
  {
    slug: 'podminky-uzivani',
    title: 'Podmínky užívání',
  },
] as const

export type FooterLegalPage = (typeof FOOTER_LEGAL_PAGES)[number]
