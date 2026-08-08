/** Ported from nazemi-design `src/data/homepage.js`. Images are paths under `public/seed/`. */
const aboutTeam = 'about-team.jpg'

export { featuredEvents as events } from './events'

export const hero = {
  segments: [
    { text: 'Potřeby všech', underline: 'violet' as const },
    { text: ' se dají naplnit\nv rámci ', underline: 'none' as const },
    { text: 'planetárních mezí', underline: 'orange' as const },
    { text: '.', underline: 'none' as const },
  ],
  subheadline:
    'Abychom této vize společně dosáhli, potřebujeme hlubokou a systémovou transformaci naší společnosti.',
}

export const donateCta = {
  title: 'Podpořte NaZemi',
  body: 'Vaše podpora je klíčová pro naši další činnost. Abychom mohli naplňovat naši misi, potřebujeme i vaši finanční podporu. Každý příspěvek nám pomůže realizovat naše programy a akce s větší svobodou od rigidních grantů. Díky dlouhodobým dárcům můžeme práci také lépe plánovat.',
  buttonLabel: 'Podpořit přes darujme.cz',
  href: 'https://www.darujme.cz/organizace/nazemi',
}

export const newsletters = [
  {
    title: 'Šnečí pošta',
    description: '(Ne)Pravidelná porce informací ze světa nerůstu.',
  },
  {
    title: 'Zpravodaj pro pedagogy a pedagožky',
    description:
      'Novinky z oblasti globálního, kritického a transformativního vzdělávání, čerstvé informace o našich seminářích.',
  },
  {
    title: 'Zpravodaj jako vyšitý',
    description:
      'Novinky z oděvního průmyslu, greenwashingu a příležitosti k zapojení; tipy na lokalizaci spotřeby a kritika korporátních praktik.',
  },
  {
    title: 'Zprávy z nebe',
    description:
      'Pošta z našeho komunitního prostoru NaNebi v Porta Coeli. Dáme ti vědět, že se chystá nebeská akce, letní brigáda nebo rozjímání v klášterních zdech.',
  },
]

/** Actions above the pillars grid (design: `organisms/pillars-block.js`). */
export const pillarsActions = [
  {
    label: 'Manifest NaZemi',
    href: '/NaZemi-Manifest-v03.pdf',
    variant: 'outline' as const,
  },
  { label: 'O NaZemi', href: '/o-nazemi', variant: 'outline' as const },
]

export const pillars = [
  {
    color: 'violet',
    title: 'Ekonomika',
    body: 'Šířením nerůstu příspíváme k budování ekonomického systému, jehož základním organizačním principem bude naplňování potřeb uvnitř planetárních mezí, ne růst a zisk. Na příkladu oděvního průmyslu v praxi zkoumáme, jak může hloubková transformace tohoto sektoru vypadat tak, aby byla sociálně spravedlivá a ekologicky udržitelná. Současný ekonomický systém je totiž posedlý růstem, vytváří bohatství pro malou skupinu lidí na úkor většiny a zároveň ničí životní prostředí.',
    buttonLabel: 'Více o ekonomice',
  },
  {
    color: 'orange',
    title: 'Vzdělávání',
    body: 'Na školách i v neformálním prostředí rozvíjíme vzdělávání, které může přispět k hluboké proměně nás samých i našich společenství směrem k vizi dobrého života pro všechny v rámci limitů planety oproti vzdělávání, které přispívá k reprodukci nerovného rozložení moci a nefunkčních vzorců jednání – vede k pasivitě, bezmocnosti, závislosti na autoritách a oddělenosti od sebe sama, druhých i přírody.',
    buttonLabel: 'Více o vzdělávání',
  },
  {
    color: 'pink',
    title: 'Fungování organizací',
    body: 'Facilitací a podporou sebeřízených organizací usilujeme o pracovní prostředí, které je demokratické, partnerské a dává prostor hlasům a potřebám všech. V takovém prostředí má práce smysl, lidé nad ní mají kontrolu a nejsou nuceni usilovat o moc nad ostatními. To je důležitá alternativa k realitě, do níž mladí dospělí vstupují po odchodu ze školy - do hierarchických struktur, kde známky nahrazují peníze, učitelku šéf a kde jsou systematicky upřednostňovány potřeby lidí na vrcholu.',
    buttonLabel: 'Více o fungování organizací',
  },
]

export { featuredNews as news } from './news'
export { homepageProjects as projects } from './projects'

export const about = {
  image: aboutTeam,
  columns: [
    {
      title: 'Kdo je NaZemi',
      body: 'Jsme nezisková nevládní organizace se sídlem v Brně, která funguje od roku 2003. Naší vizí je solidární globální společnost, která usiluje o prospěch lidského i mimolidského světa a snaží se o naplnění potřeb všech v rámci planetárních mezí. Činností NaZemi posilujeme praxi a pěstujeme hodnoty pospolitosti, spolupráce a péče jak v mezilidských vztazích a na systémové úrovni ve školách a organizacích, tak i v rovině globálních ekonomických vztahů. Zásadní je pro nás rozvoj představivosti a jsme přesvědčeni, že jiný svět je dosažitelný.',
    },
    {
      title: 'Jak fungujeme',
      body: 'Jednoduše: chováme se k sobě fér. Víme, že máme dobré úmysly, a jsme ochotni nést odpovědnost za kroky přispívající společnému záměru. Snažíme se, aby to, co děláme, naplňovalo naše potřeby, namísto toho, aby je ohrožovalo. Naši práci a spolupráci cíleně reflektujeme a tím se společně učíme. A to zejména v situacích, kdy něco nevyjde tak, jak jsme si představovali. Naše fungování stavíme na principech sebeřízení a nenásilí.',
    },
  ],
}
