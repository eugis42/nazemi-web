/** Ported from nazemi-design `src/data/events.js`. Images are paths under `public/seed/`. */
const event1 = 'event-1.jpg'
const event2 = 'event-2.jpg'
const event3 = 'event-3.jpg'

const DEFAULT_ADDRESS = 'NaNebi, Kounicova 42, 602 00, Brno'
const DEFAULT_ADDRESS_URL = 'https://maps.google.com/?q=NaNebi+Kounicova+42+Brno'
const DEFAULT_SIGNUP_URL = 'https://darujme.cz'

export function getEventHref(slug: string) {
  return `/kalendar/${slug}`
}

export type CalendarEventSeed = {
  slug: string
  image: string
  date: string
  location: string
  title: string
  tags: string[]
  filters: string[]
  past?: boolean
  time?: string
  address?: string
  addressUrl?: string
  signupUrl?: string
  bodyHtml?: string
}

export const calendarEvents: (CalendarEventSeed & { href: string })[] = ([
  {
    slug: 'nenasilna-komunikace-pro-ucitele',
    image: event1,
    date: '16. 6. 2026',
    location: 'Brno',
    title: 'Nenásilná komunikace pro učitele a učitelky',
    tags: ['Workshop', 'Nenásilná komunikace'],
    filters: ['workshop', 'nenasilna-komunikace', 'nanebi'],
    time: '9:00 – 17:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nerustova-akademie-2026',
    image: event2,
    date: '18. 6. 2026',
    location: 'Brno',
    title: 'Nerůstová akademie 2026',
    tags: ['Akademie', 'Nerůst', 'Budoucnost'],
    filters: ['akademie', 'nerust', 'budoucnost', 'nanebi'],
    time: '14:00 – 20:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nebudeme-mlcet-protest',
    image: event3,
    date: '1. 7. 2026',
    location: 'Ministerstvo ŽP, Praha',
    title: 'Nebudeme mlčet! Protest proti rozhodnutí ministerstva životního prostředí',
    tags: ['Protest', 'Občanská neposlušnost'],
    filters: ['protest'],
    time: '17:00 – 20:00',
    address: 'Ministerstvo životního prostředí, Vršovická 65, Praha',
    addressUrl: 'https://maps.google.com/?q=Ministerstvo+životního+prostředí+Praha',
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'workshop-svoboda-ktera-funguje',
    image: event2,
    date: '22. 7. 2026',
    location: 'Brno',
    title: 'Workshop: Svoboda, která funguje',
    tags: ['Workshop', 'Sebeřízení'],
    filters: ['workshop', 'nanebi'],
    time: '10:00 – 16:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'facilitace-v-praxi',
    image: event1,
    date: '5. 8. 2026',
    location: 'Brno',
    title: 'Facilitace v praxi — úvodní setkání',
    tags: ['Workshop', 'Facilitace'],
    filters: ['workshop', 'flow-makers'],
    time: '14:00 – 18:00',
    address: 'Flow Makers, Brno',
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'dekolonizovat-diskuse',
    image: event3,
    date: '12. 8. 2026',
    location: 'Brno',
    title: 'Dekolonizovat! Diskuse o globální spravedlnosti',
    tags: ['Diskuse', 'Vzdělávání'],
    filters: ['workshop'],
    time: '18:00 – 21:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nerustova-akademie-podzim',
    image: event2,
    date: '3. 9. 2026',
    location: 'Brno',
    title: 'Nerůstová akademie — podzimní běh',
    tags: ['Akademie', 'Nerůst'],
    filters: ['akademie', 'nerust', 'nanebi'],
    time: '14:00 – 20:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'budoucnost-prace-bez-hierarchie',
    image: event1,
    date: '20. 9. 2026',
    location: 'Brno',
    title: 'Budoucnost práce bez hierarchie',
    tags: ['Workshop', 'Budoucnost'],
    filters: ['workshop', 'budoucnost', 'flow-makers'],
    time: '9:30 – 17:30',
    address: 'Flow Makers, Brno',
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'protest-klimaticka-spravedlnost',
    image: event3,
    date: '10. 10. 2026',
    location: 'Praha',
    title: 'Protest za klimatickou spravedlnost',
    tags: ['Protest'],
    filters: ['protest'],
    time: '15:00 – 19:00',
    address: 'Náměstí Republiky, Praha',
    addressUrl: 'https://maps.google.com/?q=Náměstí+Republiky+Praha',
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nenasilna-komunikace-pokrocily',
    image: event2,
    date: '2. 11. 2026',
    location: 'Brno',
    title: 'Nenásilná komunikace — pokročilý kurz',
    tags: ['Workshop', 'Nenásilná komunikace'],
    filters: ['workshop', 'nenasilna-komunikace', 'nanebi'],
    time: '9:00 – 17:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'rocni-setkani-flow-makers',
    image: event1,
    date: '15. 12. 2026',
    location: 'Brno',
    title: 'Roční setkání komunity Flow Makers',
    tags: ['Komunita'],
    filters: ['flow-makers'],
    time: '16:00 – 22:00',
    address: 'Flow Makers, Brno',
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nerust-a-vzdelavani',
    image: event3,
    date: '8. 1. 2027',
    location: 'Brno',
    title: 'Nerůst a vzdělávání — otevřený den',
    tags: ['Nerůst', 'Vzdělávání'],
    filters: ['nerust', 'nanebi'],
    time: '10:00 – 18:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nerustova-akademie-2025',
    image: event2,
    date: '12. 3. 2025',
    location: 'Brno',
    title: 'Nerůstová akademie 2025',
    tags: ['Akademie', 'Nerůst'],
    filters: ['akademie', 'nerust', 'nanebi'],
    past: true,
    time: '14:00 – 20:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'workshop-facilitace-zacatecnici',
    image: event1,
    date: '4. 11. 2024',
    location: 'Brno',
    title: 'Workshop facilitace pro začátečníky',
    tags: ['Workshop'],
    filters: ['workshop', 'flow-makers'],
    past: true,
    time: '10:00 – 16:00',
    address: 'Flow Makers, Brno',
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'protest-ochrana-zelene',
    image: event3,
    date: '21. 9. 2024',
    location: 'Praha',
    title: 'Protest za ochranu zeleně v centru města',
    tags: ['Protest'],
    filters: ['protest'],
    past: true,
    time: '17:00 – 20:00',
    address: 'Náměstí Republiky, Praha',
    addressUrl: 'https://maps.google.com/?q=Náměstí+Republiky+Praha',
    signupUrl: DEFAULT_SIGNUP_URL,
  },
  {
    slug: 'nenasilna-komunikace-v-tymu',
    image: event1,
    date: '18. 6. 2024',
    location: 'Brno',
    title: 'Nenásilná komunikace v týmu',
    tags: ['Workshop', 'Nenásilná komunikace'],
    filters: ['workshop', 'nenasilna-komunikace', 'nanebi'],
    past: true,
    time: '9:00 – 17:00',
    address: DEFAULT_ADDRESS,
    addressUrl: DEFAULT_ADDRESS_URL,
    signupUrl: DEFAULT_SIGNUP_URL,
  },
] as CalendarEventSeed[]).map((event) => ({
  ...event,
  href: getEventHref(event.slug),
}))

export function getEventBySlug(slug: string) {
  return calendarEvents.find((event) => event.slug === slug)
}

/** Homepage teaser — first three upcoming events */
export const featuredEvents = calendarEvents.filter((e) => !e.past).slice(0, 3)

export const CALENDAR_FILTER_GROUPS = [
  [
    { id: 'all', label: 'Nadcházející události', kind: 'all' },
    { id: 'past', label: 'Minulé události', kind: 'past' },
  ],
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

export const CALENDAR_FILTERS = CALENDAR_FILTER_GROUPS.flat()

export const EVENTS_PER_PAGE = 9
