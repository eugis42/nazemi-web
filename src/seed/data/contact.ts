/** Ported from nazemi-design `src/data/contact.js`. Photos are paths under `public/seed/`. */
export type ContactBlockData = {
  title: string
  email?: string
  addressLines?: string[]
  note?: string
  phone?: string
  links?: { label: string; href: string; external?: boolean }[]
  extras?: string[]
}

export type TeamMemberSeed = {
  slug: string
  name: string
  role: string
  phone: string
  email: string
  imageFile: string
}

function teamImageUrl(imageFile?: string) {
  if (!imageFile) return ''
  return `team/${imageFile}`
}

export const CONTACT_BLOCKS: ContactBlockData[] = [
  {
    title: 'NaZemi',
    email: 'info@nazemi.cz',
    addressLines: ['NaZemi', 'Kounicova 42', '602 00 Brno'],
    note: 'IČO 26643073 Právnická osoba zapsaná v obchodním rejstříku vedeném u Krajského soudu v Brně od 1. 1. 2014 pod spisovou značkou L 10076.',
    phone: '+420 735 033 417',
    extras: ['č.ú.: 2600091881/2010'],
  },
  {
    title: 'NaNebi',
    email: 'nanebi@nazemi.cz',
    addressLines: ['NaNebi, s. r. o.', 'Kounicova 42', '602 00 Brno'],
    note: 'IČO 29318785 Právnická osoba zapsaná v obchodním rejstříku vedeném u Krajského soudu v Brně od 15. 1. 2013 pod spisovou značkou C 77153.',
    phone: '+420 774 427 377',
    links: [{ label: 'nazemi.cz/nanebi', href: 'https://nazemi.cz/nanebi/', external: true }],
  },
  {
    title: 'Obchod NaZemi (e-shop)',
    email: 'objednavky@nazemi.cz',
    addressLines: ['Tereza Tlapáková'],
    phone: '+420 721 295 652',
    links: [{ label: 'nazemi.cz/obchod', href: 'https://nazemi.cz/obchod/', external: true }],
  },
  {
    title: 'Knihovna NaZemi',
    email: 'knihovna@nazemi.cz',
    phone: '+420 737 587 462',
    links: [{ label: 'nazemi.cz/knihovna', href: 'https://nazemi.cz/knihovna/', external: true }],
  },
  {
    title: 'Téma oděvního průmyslu',
    email: 'justfashion@nazemi.cz',
    links: [{ label: 'nazemi.cz/odevy', href: 'https://nazemi.cz/odevy/', external: true }],
  },
]

const TEAM_SEED: TeamMemberSeed[] = [
  { slug: 'klara.berg', name: 'Klára Berg', role: 'členka předsednictva spolku, Generace symbiocén, BROD', phone: '+420 736 435 829', email: 'klara.berg@nazemi.cz', imageFile: 'klara.berg.jpg' },
  { slug: 'jasna.cifrova', name: 'Jasna Cifrová', role: 'členka předsednictva spolku, vzdělávání o greenwashingu', phone: '+420 776 077 026', email: 'jasna.cifrova@nazemi.cz', imageFile: 'jasna.cifrova.jpg' },
  { slug: 'martin.cech', name: 'Martin Čech', role: 'člen předsednictva spolku, nerůst, důstojná práce', phone: '', email: 'martin.cech@nazemi.cz', imageFile: 'martin.cech.png' },
  { slug: 'michaela.vodakova', name: 'Michaela Vodáková', role: 'členka předsednictva spolku, finanční podpora, účetní', phone: '+420 776 850 605', email: 'michaela.vodakova@nazemi.cz', imageFile: 'michaela.vodakova.jpg' },
  { slug: 'petra.fruhbauerova', name: 'Petra Frühbauerová', role: 'facilitace, NaNebi', phone: '+420 774 427 377', email: 'petra.fruhbauerova@nazemi.cz', imageFile: 'petra.fruhbauerova.jpg' },
  { slug: 'tadeas.zdarsky', name: 'Tadeáš Žďárský', role: 'nerůst', phone: '', email: 'tadeas.zdarsky@nazemi.cz', imageFile: 'tadeas.zdarsky.jpg' },
  { slug: 'eva.malirova', name: 'Eva Malířová', role: 'metodička a lektorka globálního vzdělávání, facilitátorka', phone: '+420 774 437 377', email: 'eva.malirova@nazemi.cz', imageFile: 'eva.malirova.jpg' },
  { slug: 'anna.lazorova', name: 'Anna Lazorová', role: 'pracovní podmínky v oděvním a obuvnickém průmyslu', phone: '+420 776 110 787', email: 'anna.lazorova@nazemi.cz', imageFile: 'anna.lazorova.jpg' },
  { slug: 'tereza.volmutova', name: 'Tereza Volmutová', role: 'Generace symbiocén, lektorka, transformace oděvního průmyslu', phone: '', email: 'tereza.volmutova@nazemi.cz', imageFile: 'tereza.volmutova.jpg' },
  { slug: 'martina.holkova', name: 'Martina Holková', role: 'metodička a lektorka globálního vzdělávání', phone: '', email: 'martina.holkova@nazemi.cz', imageFile: 'martina.holkova.jpg' },
  { slug: 'magdalena.sipka', name: 'Magdalena Šipka', role: 'vzdělávání, projekty Futuropolis, Brod', phone: '+420 732 975 289', email: 'magdalena.sipka@nazemi.cz', imageFile: 'magdalena.sipka.jpg' },
  { slug: 'radoslava.krylova', name: 'Radoslava Krylová', role: 'facilitátorka', phone: '', email: 'radoslava.krylova@nazemi.cz', imageFile: 'radoslava.krylova.jpg' },
  { slug: 'tereza.tlapakova', name: 'Tereza Tlapáková', role: 'E-shop NaZemi', phone: '', email: 'tereza.tlapakova@nazemi.cz', imageFile: 'tereza.tlapakova.jpg' },
  { slug: 'michaela.rychtecka', name: 'Michaela Rychtecká', role: 'metodička, lektorka', phone: '+420 775 712 975', email: 'michaela.rychtecka@nazemi.cz', imageFile: 'michaela.rychtecka.jpg' },
  { slug: 'katarina.kovacova', name: 'Katarína Kováčová', role: 'nerůst', phone: '+421 908 556 590', email: 'katarina.kovacova@nazemi.cz', imageFile: 'katarina.kovacova.jpg' },
  { slug: 'jan.albrecht', name: 'Jan Albrecht', role: 'nerůst', phone: '', email: 'jan.albrecht@nazemi.cz', imageFile: 'jan.albrecht.jpg' },
  { slug: 'lukas.pokorny', name: 'Lukáš Pokorný', role: 'lektor globálního vzdělávání', phone: '', email: 'lukas.pokorny@nazemi.cz', imageFile: 'lukas.pokorny.jpg' },
  { slug: 'martin.jestrabek', name: 'Martin Jestřábek', role: 'lektor globálního vzdělávání', phone: '', email: 'martin.jestrabek@nazemi.cz', imageFile: 'martin.jestrabek.jpg' },
  { slug: 'karel.dolecek', name: 'Karel Doleček', role: 'facilitátor', phone: '', email: 'karel.dolecek@nazemi.cz', imageFile: 'karel.dolecek.jpg' },
  { slug: 'petr.jestrabek', name: 'Petr Jestřábek', role: 'IT podpora, NaNebi', phone: '+420 776 045 126', email: 'petr.jestrabek@nazemi.cz', imageFile: 'petr.jestrabek.jpg' },
  { slug: 'marcela.hajkova', name: 'Marcela Hájková', role: 'správkyně knihovny NaZemi', phone: '+420 737 587 462 (SMS)', email: 'knihovna@nazemi.cz', imageFile: 'marcela.hajkova.jpg' },
  { slug: 'sabina.vojtechova', name: 'Sabina Vojtěchová', role: 'lektorka, facilitátorka', phone: '', email: 'sabina.vojtechova@nazemi.cz', imageFile: 'sabina.vojtechova.jpg' },
  { slug: 'adam.cajka', name: 'Adam Čajka', role: 'facilitátor, lektor, metodik, nerůst', phone: '', email: 'adam.cajka@nazemi.cz', imageFile: 'adam.cajka.jpg' },
  { slug: 'tereza.kulhankova', name: 'Tereza Kulhánková', role: 'facilitátorka, NaNebi', phone: '', email: 'tereza.kulhankova@nazemi.cz', imageFile: 'tereza.kulhankova.jpg' },
  { slug: 'lucie.huscavova', name: 'Lucie Huščavová', role: 'Obchod NaZemi', phone: '', email: '', imageFile: 'lucie.huscavova.jpg' },
  { slug: 'eliska.hanzlova', name: 'Eliška Hanzlová', role: 'vzdělávání a podpora pedagogů', phone: '', email: 'eliska.hanzlova@nazemi.cz', imageFile: 'eliska.hanzlova.jpg' },
  { slug: 'kristyna.hrubanova', name: 'Kristýna Hrubanová', role: 'metodička, lektorka, facilitátorka, NaNebi', phone: '+420 777 110 434', email: 'kristyna.hrubanova@nazemi.cz', imageFile: 'kristyna.hrubanova.jpg' },
  { slug: 'anna.hubackova', name: 'Anna Hubáčková', role: 'Generace symbiocén, lektorka a metodička vzdělávání', phone: '', email: 'anna.hubackova@nazemi.cz', imageFile: 'anna.hubackova.jpg' },
  { slug: 'sona-chalanyova', name: 'Soňa Chalányová', role: 'facilitátorka', phone: '', email: 'sona.chalanyova@nazemi.cz', imageFile: '' },
  { slug: 'sona-mala', name: 'Soňa Malá', role: 'facilitátorka', phone: '', email: 'sona.mala@nazemi.cz', imageFile: '' },
  { slug: 'alzbeta-popelka', name: 'Alžběta Popelka', role: 'facilitátorka', phone: '', email: 'alzbeta.popelka@nazemi.cz', imageFile: '' },
]

export const teamMembers = TEAM_SEED.map((member) => ({
  ...member,
  image: teamImageUrl(member.imageFile),
}))
