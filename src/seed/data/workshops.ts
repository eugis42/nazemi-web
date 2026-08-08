/** Ported from nazemi-design `src/data/workshops.js`. Images are paths under `public/seed/`. */
const event1 = 'event-1.jpg'
const event2 = 'event-2.jpg'
const event3 = 'event-3.jpg'
const news3 = 'news-3.jpg'
const news4 = 'news-4.jpg'
const aboutTeam = 'about-team.jpg'

export type WorkshopSpeaker = { name: string; role: string; image?: string }
export type WorkshopTestimonial = { quote: string; author: string; role?: string }
export type WorkshopPricing = { min?: number; max?: number; note?: string }
export type WorkshopSeed = {
  slug: string
  image: string
  title: string
  audienceTags: string[]
  topicTags: string[]
  description: string
  shortDescription: string
  length: string
  groupSize: string
  takeaways: string[]
  pricing: WorkshopPricing
  orderUrl?: string
  orderLabel?: string
  speakers: WorkshopSpeaker[]
  testimonials: WorkshopTestimonial[]
  bodyHtml?: string
}

export const WORKSHOP_AUDIENCE_TAGS = [
  'Pro mladé',
  'Pro veřejnost',
  'Pro vzdělavatele',
  'Pro organizace',
]

export const WORKSHOP_TOPIC_TAGS = [
  'Klima',
  'Konflikty',
  'Práce',
  'Spotřeba',
  'Oděvní průmysl',
  'Nerůst',
  'Nerovnosti',
  'Sebeřízení',
  'Dovednosti pro spolupráci',
]

export const AUDIENCE_FILTER_IDS: Record<string, string> = {
  'Pro mladé': 'pro-mlade',
  'Pro veřejnost': 'pro-verejnost',
  'Pro vzdělavatele': 'pro-vzdelavatele',
  'Pro organizace': 'pro-organizace',
}

export const TOPIC_FILTER_IDS: Record<string, string> = {
  Klima: 'klima',
  Konflikty: 'konflikty',
  Práce: 'prace',
  Spotřeba: 'spotreba',
  'Oděvní průmysl': 'odevni-prumysl',
  Nerůst: 'nerust',
  Nerovnosti: 'nerovnosti',
  Sebeřízení: 'seberizeni',
  'Dovednosti pro spolupráci': 'dovednosti-pro-spolupraci',
}

function buildWorkshopFilters(audienceTags: string[], topicTags: string[]) {
  return [
    ...audienceTags.map((tag) => AUDIENCE_FILTER_IDS[tag]),
    ...topicTags.map((tag) => TOPIC_FILTER_IDS[tag]),
  ].filter(Boolean)
}

export const WORKSHOP_FILTER_GROUPS = [
  [{ id: 'all', label: 'Všechny workshopy', kind: 'all' }],
  WORKSHOP_AUDIENCE_TAGS.map((label) => ({
    id: AUDIENCE_FILTER_IDS[label],
    label,
  })),
  WORKSHOP_TOPIC_TAGS.map((label) => ({
    id: TOPIC_FILTER_IDS[label],
    label,
  })),
]

export const WORKSHOPS_PER_PAGE = 50

export function getWorkshopHref(slug: string) {
  return `/workshopy/${slug}`
}

export function getWorkshopBySlug(slug: string) {
  return workshops.find((workshop) => workshop.slug === slug) ?? null
}

export const workshops: (WorkshopSeed & { filters: string[]; href: string })[] = ([
  {
    slug: 'nenasilna-komunikace',
    image: event1,
    title: 'Nenásilná komunikace pro učitele a učitelky',
    audienceTags: ['Pro vzdělavatele'],
    topicTags: ['Konflikty', 'Dovednosti pro spolupráci'],
    description:
      'Workshop propojuje teorii nenásilné komunikace s každodenní praxí ve třídě. Účastníci si vyzkouší nástroje pro empatický dialog a řešení konfliktů.',
    shortDescription:
      'Praktický workshop pro pedagogy, kteří chtějí vést třídu s respektem, jasností a empatií — bez sankcí a bez ztráty autority.',
    length: '6 hodin',
    groupSize: '12–24 účastníků',
    takeaways: [
      'Nástroje pro empatický dialog ve třídě i na poradách',
      'Jak pojmenovat potřeby za konfliktním chováním žáků',
      'Postupy pro mediace mezi žáky a v kolektivu pedagogů',
    ],
    pricing: { min: 12000, max: 18000 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Nen%C3%A1siln%C3%A1%20komunikace',
    speakers: [
      {
        name: 'Petra Svobodová',
        role: 'Certifikovaná lektorka nenásilné komunikace',
        image: aboutTeam,
      },
      {
        name: 'Marie Nováková',
        role: 'Pedagožka a facilitátorka transformativního vzdělávání',
      },
      {
        name: 'Klára Horáková',
        role: 'Facilitátorka školních týmů',
      },
    ],
    testimonials: [
      {
        quote:
          'Konečně workshop, který nepřednáší teorii, ale nechá vás hned zkoušet situace z vaší třídy. Odnesla jsem si konkrétní věty, které používám každý týden.',
        author: 'Jana Horáková',
        role: 'učitelka na ZŠ',
      },
      {
        quote:
          'Skvělá atmosféra bez hodnocení. Tým NaZemi umí vytvořit prostor, kde se i ostýchaví kolegové zapojí.',
        author: 'Martin Beneš',
        role: 'zástupce ředitele',
      },
      {
        quote: 'Praktické scénáře z reálné školy — konečně něco, co můžu použít hned druhý den.',
        author: 'Lenka Čermáková',
        role: 'třídní učitelka',
      },
      {
        quote: 'Facilitace byla citlivá, ale strukturovaná. Cítila jsem se bezpečně zkoušet nové přístupy.',
        author: 'Ondřej Malý',
        role: 'výchovný poradce',
      },
    ],
    bodyHtml: `<h2>Průběh workshopu</h2>
<p>Den začíná krátkým úvodem do principů nenásilné komunikace a pokračuje střídáním mini-přednášek, cvičení ve dvojicích a reflexí ve skupině. Odpoledne věnujeme reálným kazuistikám účastníků — situacím, které si přinesete ze své praxe.</p>
<p>Workshop je postavený na metodě role-play a okamžité zpětné vazbě. Nečekejte hodiny teorie u tabule; většinu času strávíte v dialogu s kolegy a lektory.</p>

<h3>Harmonogram dne</h3>
<ol>
  <li><strong>9:00</strong> — Uvítání, seznámení a nastavení společných pravidel</li>
  <li><strong>9:30</strong> — Úvod do NC: pozorování, pocity, potřeby, žádosti</li>
  <li><strong>11:00</strong> — Přestávka</li>
  <li><strong>11:15</strong> — Cvičení ve dvojicích: přerámování konfliktních vět</li>
  <li><strong>12:30</strong> — Oběd</li>
  <li><strong>13:30</strong> — Kazuistiky z třídy: analýza a návrh intervencí</li>
  <li><strong>15:00</strong> — Skupinová reflexe a plán dalších kroků</li>
  <li><strong>16:30</strong> — Závěr a prostor pro dotazy</li>
</ol>

<h3>Pro koho je workshop určen</h3>
<ul>
  <li>Učitelé a učitelky všech stupňů škol</li>
  <li>Výchovní poradci a školní psychologové</li>
  <li>Školští lídři, kteří chtějí změnit kulturu na pracovišti</li>
  <li>Každý pedagog, kdo řeší konflikty ve třídě i mezi kolegy</li>
</ul>

<blockquote>
  <p>Nenásilná komunikace není o tom být milejší. Je o tom být jasnější — a zároveň vnímat potřeby druhých.</p>
</blockquote>

<h3>Co si připravit</h3>
<ul>
  <li>Krátký popis jedné situace z vaší praxe (volitelné, ale užitečné)</li>
  <li>Poznámkový blok</li>
  <li>Otevřenost k tomu, že některá cvičení mohou být nepohodlná — a že to je v pořádku</li>
</ul>

<h3>Možnosti navazující spolupráce</h3>
<p>Workshop lze přizpůsobit na míru konkrétní škole — včetně následné supervize pro tým pedagogů nebo facilitované porady s vedením školy. Napište nám na <a href="mailto:workshopy@nazemi.cz">workshopy@nazemi.cz</a>.</p>`,
  },
  {
    slug: 'facilitace-v-tymu',
    image: news4,
    title: 'Facilitace v týmu',
    audienceTags: ['Pro organizace'],
    topicTags: ['Sebeřízení', 'Dovednosti pro spolupráci'],
    description:
      'Praktický trénink facilitačních dovedností pro vedoucí týmů a HR. Zaměřujeme se na sebeřízení, rozhodování a společnou odpovědnost.',
    shortDescription:
      'Intenzivní trénink pro týmy a lídry, kteří chtějí vést setkání bez dominance hierarchie — s jasným procesem a prostorem pro všechny hlasy.',
    length: '2 dny',
    groupSize: '8–16 účastníků',
    takeaways: [
      'Facilitační postupy pro rozhodování bez hlasování',
      'Jak držet proces a zároveň nechat prostor emocím',
      'Plán zavedení facilitace do vašeho týmu',
    ],
    pricing: { min: 28000, max: 42000 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Facilitace%20v%20t%C3%BFDmu',
    speakers: [
      {
        name: 'Klára Horáková',
        role: 'Facilitátorka a konzultantka sebeřízených organizací',
        image: aboutTeam,
      },
      {
        name: 'Tomáš Černý',
        role: 'Lektor participativního rozhodování',
      },
      {
        name: 'Marie Nováková',
        role: 'Konzultantka týmové spolupráce',
      },
    ],
    testimonials: [
      {
        quote:
          'Po dvou dnech jsme měli poprvé poradu, kde mluvil každý — a přitom jsme se domluvili rychleji než obvykle.',
        author: 'Eva Procházková',
        role: 'HR manažerka',
      },
      {
        quote:
          'Nejvíc oceňuji konkrétní šablony agendy a checklisty. Nezůstalo to u inspirace, hned jsme to zavedli.',
        author: 'David Kučera',
        role: 'team lead',
      },
      {
        quote: 'Konečně porada, kde se nikdo necítil přehlédnutý. A přitom jsme se domluvili rychleji.',
        author: 'Simona Krátká',
        role: 'vedoucí týmu',
      },
      {
        quote: 'Facilitační nástroje jsme rovnou vyzkoušeli na vlastním projektu. Fungovalo to.',
        author: 'Michal Urban',
        role: 'product owner',
      },
    ],
    bodyHtml: `<h2>Co vás čeká</h2>
<p>První den se věnujeme základům facilitace a sebeřízení, druhý den modelovým situacím z vaší praxe. Každý účastník odchází s facilitačním plánem pro svůj tým a sadou šablon pro běžné typy setkání.</p>
<p>Program je intenzivní — počítejte s tím, že budete facilitovat už v průběhu druhého dne. Lektoři vás provedou zpětnou vazbou v reálném čase.</p>

<h3>Formát</h3>
<ul>
  <li>Teorie střídána praxí — minimum slidů</li>
  <li>Facilitační laboratoř s okamžitou zpětnou vazbou</li>
  <li>Společné plánování follow-up setkání</li>
  <li>Práce s vašimi vlastními agendami a tématy</li>
</ul>

<h3>Program dvoudenního workshopu</h3>
<h4>Den 1 — Základy</h4>
<ol>
  <li>Role facilitátora vs. experta</li>
  <li>Design setkání: cíl, pravidla, čas</li>
  <li>Techniky pro vyvážení hlasů ve skupině</li>
  <li>Večerní reflexe v malých skupinách</li>
</ol>
<h4>Den 2 — Praxe</h4>
<ol>
  <li>Facilitace modelových situací účastníků</li>
  <li>Práce s konfliktem a emocemi v místnosti</li>
  <li>Rozhodování bez hlasování: konsenzus a souhlas</li>
  <li>Prezentace facilitačních plánů a závěr</li>
</ol>

<blockquote>
  <p>Dobrá facilitace není o tom mít všechny odpovědi. Je o tom vytvořit prostor, kde je tým schopný odpovědi najít společně.</p>
</blockquote>

<h3>Pro koho</h3>
<dl>
  <dt>Vedoucí týmů a team leadři</dt>
  <dd>Kteří chtějí přestat být úzkým hrdlem rozhodování</dd>
  <dt>HR a People týmy</dt>
  <dd>Které hledají nástroje pro participativní kulturu</dd>
  <dt>Facilitátoři na začátku cesty</dt>
  <dd>Kteří chtějí systematický trénink místo učení metodou pokus–omyl</dd>
</dl>`,
  },
  {
    slug: 'nerust-pro-zacatecniky',
    image: event2,
    title: 'Nerůst pro začátečníky',
    audienceTags: ['Pro veřejnost'],
    topicTags: ['Nerůst', 'Spotřeba'],
    description:
      'Úvod do konceptů nerůstu a planetárních mezí. Společně zkoumáme, proč je růstová logika problematická a jaké alternativy existují.',
    shortDescription:
      'Srozumitelný úvod do nerůstu pro každého, kdo cítí, že „víc a rychleji" není odpověď — a chce najít jazyk pro alternativy.',
    length: '3 hodiny',
    groupSize: '15–40 účastníků',
    takeaways: [
      'Základní pojmy nerůstu a planetárních mezí',
      'Jak mluvit o nerůstu s přáteli a kolegy',
      'Inspirace z praxe komunit v Česku i v zahraničí',
    ],
    pricing: { min: 350, max: 800 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Ner%C5%AFst%20pro%20za%C4%8D%C3%A1te%C4%8Dn%C3%ADky',
    speakers: [
      {
        name: 'Tadeáš Žďárský',
        role: 'Koordinátor projektu Nerůst',
        image: aboutTeam,
      },
      {
        name: 'Petra Svobodová',
        role: 'Lektorka globálního rozvojového vzdělávání',
      },
      {
        name: 'Jan Dvořák',
        role: 'Aktivista a lektor klimatické spravedlnosti',
      },
    ],
    testimonials: [
      {
        quote:
          'Konečně mi někdo vysvětlil nerůst tak, že to pochopí i moje máma. Srozumitelně, bez moralizování.',
        author: 'Lucie Marková',
        role: 'účastnice',
      },
      {
        quote:
          'Skvělá diskuse — prostor pro pochybnosti i nesouhlas. Přesně tak by měla vypadat veřejná debata.',
        author: 'Pavel Růžička',
        role: 'dobrovolník',
      },
      {
        quote: 'Nerůst konečně dává smysl i lidem mimo bublinu. Srozumitelně a bez strašení.',
        author: 'Alena Soukupová',
        role: 'knihovnice',
      },
      {
        quote: 'Odnesl jsem si argumenty, které používám v debatách s rodinou i na pracovišti.',
        author: 'Filip Horák',
        role: 'účastník',
      },
    ],
    bodyHtml: `<h2>O workshopu</h2>
<p>Vstupní setkání bez předchozích znalostí. Společně si projdeme, proč ekonomický růst naráží na limity planety a jaké politiky a praktiky nabízí hnutí za nerůst.</p>
<p>Workshop je vhodný pro knihovny, komunitní centra, školy i firemní týmy, které chtějí otevřít téma udržitelnosti bez dogmat a bez strašení.</p>

<h3>Co probereme</h3>
<ul>
  <li>Planetární hranice a jejich propojení s každodenní spotřebou</li>
  <li>Proč „zelený růst" nestačí — a co znamená degrowth</li>
  <li>Příklady z praxe: města, firmy a komunity, které experimentují s jinou logikou</li>
  <li>Jak mluvit o nerůstu s lidmi, kteří téma vnímají skepticky</li>
</ul>

<h3>Průběh setkání</h3>
<ol>
  <li><strong>0:00</strong> — Úvod a mapování očekávání skupiny</li>
  <li><strong>0:20</strong> — Krátký vstup: nerůst v kontextu klimatické krize</li>
  <li><strong>0:50</strong> — Diskuse ve malých skupinách</li>
  <li><strong>1:30</strong> — Přestávka</li>
  <li><strong>1:45</strong> — Workshopová část: spotřeba a spravedlnost</li>
  <li><strong>2:30</strong> — Společné shrnutí a prostor pro dotazy</li>
</ol>

<blockquote>
  <p>Nerůst není návrat do minulosti. Je to otázka, jak chceme žít dobře v mezích planety — a kdo má mít hlas při odpovědi.</p>
</blockquote>

<h3>Pro koho je workshop</h3>
<p>Pro širokou veřejnost — studenty, seniory, pracující i nepracující. Nepotřebujete žádné ekonomické vzdělání. Potřebujete jen chuť diskutovat a ochotu přemýšlet jinak než v kategoriích „více = lépe".</p>

<h3>Organizace na míru</h3>
<p>Rádi workshop přizpůsobíme vaší instituci — například s důrazem na spotřebu, dopravu nebo lokální politiku. Ozvěte se na <a href="mailto:workshopy@nazemi.cz">workshopy@nazemi.cz</a>.</p>`,
  },
  {
    slug: 'globalni-vzdelavani',
    image: news3,
    title: 'Globální rozvojové vzdělávání v praxi',
    audienceTags: ['Pro vzdělavatele', 'Pro organizace'],
    topicTags: ['Nerovnosti', 'Klima'],
    description:
      'Metodický workshop pro učitele a lektory, kteří chtějí propojit globální témata s výukou a neformálním vzděláváním.',
    shortDescription:
      'Metodická podpora pro lektory, kteří chtějí propojit globální témata — nerovnosti, klima, migraci — s každodenní výukou.',
    length: '1 den',
    groupSize: '10–20 účastníků',
    takeaways: [
      'Metody globálního rozvojového vzdělávání připravené k použití',
      'Jak pracovat s kontroverzními tématy bez polarizace',
      'Sada aktivit pro různé věkové skupiny',
    ],
    pricing: { min: 15000, max: 22000 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Glob%C3%A1ln%C3%AD%20vzd%C4%9Bl%C3%A1v%C3%A1n%C3%AD',
    speakers: [
      {
        name: 'Marie Nováková',
        role: 'Metodička globálního vzdělávání',
        image: aboutTeam,
      },
      {
        name: 'Petra Svobodová',
        role: 'Facilitátorka vzdělávacích programů',
      },
      {
        name: 'Tadeáš Žďárský',
        role: 'Lektor globálních témat a nerovností',
      },
      {
        name: 'Klára Horáková',
        role: 'Metodička participativního vzdělávání',
      },
    ],
    testimonials: [
      {
        quote:
          'Odcházela jsem s hotovými scénáři hodin. Ušetřilo mi to týdny příprav a studenti byli víc zapojení než obvykle.',
        author: 'Kateřina Vlčková',
        role: 'učitelka GV na SŠ',
      },
      {
        quote: 'Metodická podpora byla přesná — žádná obecná rétorika, jen věci, které fungují ve třídě.',
        author: 'Tomáš Hrubý',
        role: 'lektor dospělých',
      },
      {
        quote: 'Citlivě vedená diskuse o nerovnostech. Studenti se zapojili víc než u běžné hodiny.',
        author: 'Eva Marková',
        role: 'učitelka na ZŠ',
      },
      {
        quote: 'Klima a globální témata konečně v souvislostech, ne jako samostatné okénko v učebnici.',
        author: 'Jiří Pospíšil',
        role: 'garant výuky',
      },
    ],
    bodyHtml: `<h2>Program dne</h2>
<p>Dopoledne věnujeme teoretickému rámci globálního rozvojového vzdělávání (GRV) a sdílení zkušeností účastníků. Odpoledne tvoříte vlastní lekce s metodickou podporou lektorů NaZemi — od návrhu aktivity po reflexi, jak ji vést v kontroverzním tématu.</p>

<h3>Dopolední blok</h3>
<ul>
  <li>GRV v českém kurikulu: kde a jak ho zapojit</li>
  <li>Práce s citlivými tématy: migrace, nerovnosti, klima</li>
  <li>Metody aktivního učení: světová káva, linie, role-play</li>
</ul>

<h3>Odpolední blok</h3>
<ul>
  <li>Tvorba vlastní aktivity ve dvojicích nebo malých týmech</li>
  <li>Vzájemné testování a zpětná vazba</li>
  <li>Úprava scénářů podle věku a kontextu skupiny</li>
</ul>

<h3>Výstupy</h3>
<ul>
  <li>Minimálně dvě připravené aktivity pro vaši skupinu</li>
  <li>Checklist pro práci s citlivými tématy</li>
  <li>Přístup k online metodické knihovně NaZemi</li>
  <li>Kontakt na komunitu lektorů GRV pro další sdílení</li>
</ul>

<h3>Harmonogram</h3>
<ol>
  <li><strong>9:00</strong> — Registrace a úvod</li>
  <li><strong>9:30</strong> — Teoretický rámec GRV</li>
  <li><strong>11:00</strong> — Přestávka</li>
  <li><strong>11:15</strong> — Metodický workshop: ukázky aktivit</li>
  <li><strong>12:30</strong> — Oběd</li>
  <li><strong>13:30</strong> — Tvorba vlastních lekcí</li>
  <li><strong>15:30</strong> — Prezentace a společná reflexe</li>
  <li><strong>16:30</strong> — Závěr</li>
</ol>

<blockquote>
  <p>Globální témata nepatří do jedné hodiny na konec pololetí. Patří do každodenní výuky — jako souvislost, ne jako okénko navíc.</p>
</blockquote>

<p>Workshop je akreditovaný v rámci dalšího vzdělávání pedagogických pracovníků. Po domluvě vystavíme potvrzení o účasti.</p>`,
  },
  {
    slug: 'seberizeni-organizaci',
    image: aboutTeam,
    title: 'Sebeřízení v organizacích',
    audienceTags: ['Pro organizace'],
    topicTags: ['Sebeřízení', 'Práce'],
    description:
      'Jak budovat pracovní prostředí bez hierarchie, kde mají lidé hlas a práce má smysl. Sdílení zkušeností z praxe NaZemi a partnerů.',
    shortDescription:
      'Workshop pro týmy a vedení organizací, které chtějí přejít od hierarchie k sdílené odpovědnosti — s ohledem na realitu českého pracovního práva.',
    length: '1 den',
    groupSize: '6–14 účastníků',
    takeaways: [
      'Mapa přechodu k sebeřízení ve vaší organizaci',
      'Právní a procesní rámec v ČR',
      'Příklady z praxe NaZemi, Flow Makers a partnerů',
    ],
    pricing: { min: 22000, max: 32000 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Sebe%C5%99%C3%ADzen%C3%AD',
    speakers: [
      {
        name: 'Klára Horáková',
        role: 'Konzultantka organizačního designu',
        image: aboutTeam,
      },
      {
        name: 'Tadeáš Žďárský',
        role: 'Spoluzakladatel NaZemi',
      },
      {
        name: 'Petra Svobodová',
        role: 'Facilitátorka sebeřízených týmů',
      },
    ],
    testimonials: [
      {
        quote:
          'Poprvé jsme si s vedením upřímně řekli, co nás na sebeřízení děsí. A dostali jsme konkrétní kroky, ne jen hesla.',
        author: 'Hana Šimková',
        role: 'ředitelka neziskovky',
      },
      {
        quote:
          'Oceňuji otevřenost k tomu, že sebeřízení není pro každého. Pomohlo nám to nastavit realistická očekávání.',
        author: 'Jakub Polák',
        role: 'zakladatel startupu',
      },
      {
        quote: 'Konkrétní kroky místo buzzwordů. Týden po workshopu jsme změnili způsob porad.',
        author: 'Veronika Jelínková',
        role: 'COO',
      },
      {
        quote: 'Lektoři znali český kontext — žádné americké manuály, které u nás nefungují.',
        author: 'Petr Doležal',
        role: 'ředitel spolku',
      },
    ],
    bodyHtml: `<h2>Obsah workshopu</h2>
<p>Společně projdeme principy sebeřízení, překážky v českém kontextu a konkrétní nástroje — od role boardu po distribuci rozhodovací pravomoci. Workshop kombinuje vstupy expertů, práci v týmech a analýzu vašich vlastních organizačních situací.</p>

<h3>Klíčová témata</h3>
<ul>
  <li>Sebeřízení vs. holokracie vs. tradiční hierarchie — co je co</li>
  <li>Role lídra v sebeřízené organizaci</li>
  <li>Rozhodovací procesy: rada, konsenzus, mandáty</li>
  <li>Pracovní právo a smlouvy v českém prostředí</li>
  <li>Transparentnost informací a otevřené platy</li>
</ul>

<blockquote>
  <p>Sebeřízení není absence struktury. Je to struktura, kterou si tým průběžně obnovuje.</p>
</blockquote>

<h3>Průběh dne</h3>
<ol>
  <li><strong>9:00</strong> — Mapování současného stavu účastnických organizací</li>
  <li><strong>10:30</strong> — Principy a příklady z praxe NaZemi a partnerů</li>
  <li><strong>12:00</strong> — Oběd</li>
  <li><strong>13:00</strong> — Pracovní skupiny: návrh změn ve vaší organizaci</li>
  <li><strong>15:00</strong> — Prezentace plánů a zpětná vazba</li>
  <li><strong>16:00</strong> — Závěrečná diskuse: co je realistické v příštích 6 měsících</li>
</ol>

<h3>Pro koho doporučujeme workshop</h3>
<dl>
  <dt>Leadership tým</dt>
  <dd>Který zvažuje přechod k sebeřízení nebo participativnímu rozhodování</dd>
  <dt>Neziskové organizace</dt>
  <dd>Které chtějí sladit vnitřní kulturu s misí</dd>
  <dt>Firmy v růstové fázi</dt>
  <dd>Které chtějí nastavit pravidla dřív, než je kultura daná náhodou</dd>
</dl>

<p>Workshop doporučujeme objednat pro celý leadership tým nebo pracovní skupinu, která změnu připravuje. Individuální účast je možná, ale týmový přístup přináší lepší výsledky.</p>`,
  },
  {
    slug: 'obcanska-odolnost',
    image: event3,
    title: 'Občanská odolnost a aktivismus',
    audienceTags: ['Pro veřejnost', 'Pro mladé'],
    topicTags: ['Konflikty'],
    description:
      'Workshop o strategiím nenásilného odporu, péči o aktivisty a dlouhodobé udržitelnosti společenských změn.',
    shortDescription:
      'Praktický úvod do aktivismu a občanské neposlušnosti pro mladé lidi a komunity, které chtějí jednat — bez vyhoření a s péčí o sebe navzájem.',
    length: '4 hodiny',
    groupSize: '12–30 účastníků',
    takeaways: [
      'Základy strategie nenásilného odporu',
      'Jak plánovat akci a starat se o bezpečí skupiny',
      'Nástroje péče o aktivisty a prevence vyhoření',
    ],
    pricing: { min: 8000, max: 14000 },
    orderUrl: 'mailto:workshopy@nazemi.cz?subject=Objednávka%20workshopu%20Ob%C4%8Dansk%C3%A1%20odolnost',
    speakers: [
      {
        name: 'Tomáš Černý',
        role: 'Lektor občanské neposlušnosti a aktivismu',
        image: aboutTeam,
      },
      {
        name: 'Petra Svobodová',
        role: 'Facilitátorka komunitních akcí',
      },
      {
        name: 'Marie Nováková',
        role: 'Lektorka participativního vzdělávání',
      },
    ],
    testimonials: [
      {
        quote:
          'Se skupinou mladých aktivistů jsme konečně prodiskutovali bezpečí i emoce. Dřív jsme řešili jen logistiku akcí.',
        author: 'Míra Novotný',
        role: 'koordinátor komunitního centra',
      },
      {
        quote:
          'Workshop mi dal jistotu, že můžu jít do ulice a zároveň dbát o hranice — svoje i ostatních.',
        author: 'Aneta Křížová',
        role: 'studentka',
      },
      {
        quote: 'Bezpečí a strategie v jednom balíčku. Přesně to naše skupina potřebovala.',
        author: 'Barbora Němcová',
        role: 'aktivistka',
      },
      {
        quote: 'Konečně jsme si řekli, jak pečovat o lidi v akci, nejen o výsledky kampaně.',
        author: 'Lukáš Vít',
        role: 'koordinátor iniciativy',
      },
    ],
    bodyHtml: `<h2>Pro koho</h2>
<ul>
  <li>Mladí lidé a studentské skupiny</li>
  <li>Občanské iniciativy na začátku cesty</li>
  <li>Komunity řešící lokální krizové situace</li>
  <li>Každý, kdo cítí potřebu jednat — a hledá, jak to dělat udržitelně</li>
</ul>

<h3>Co se naučíte</h3>
<ul>
  <li>Základy strategie nenásilného odporu a občanské neposlušnosti</li>
  <li>Jak plánovat akci: cíle, rizika, role, komunikace</li>
  <li>Péče o aktivisty: prevence vyhoření a podpora v týmu</li>
  <li>Právní minimum pro účast na demonstracích v ČR</li>
</ul>

<h3>Průběh workshopu</h3>
<ol>
  <li><strong>13:00</strong> — Úvod a sdílení motivací účastníků</li>
  <li><strong>13:30</strong> — Teorie: odpor, moc a změna</li>
  <li><strong>14:30</strong> — Práce v podskupinách: plánování modelové akce</li>
  <li><strong>15:30</strong> — Přestávka</li>
  <li><strong>15:45</strong> — Bezpečí, emoce a hranice v aktivismu</li>
  <li><strong>16:30</strong> — Závěrečné sdílení a další kroky</li>
</ol>

<blockquote>
  <p>Aktivismus není sprint. Je to maraton — a maratonci potřebují pitný režim, ne jen adrenalin.</p>
</blockquote>

<h3>Bezpečí a inkluze</h3>
<p>Workshop vede tým s praxí v občanské neposlušnosti i v péči o aktivisty. Respektujeme různé úrovně zkušeností i fyzické možnosti účastníků. Prostor je LGBTQ+ friendly a bezpečný pro sdílení.</p>

<h3>Navazující podpora</h3>
<p>Po workshopu nabízíme konzultaci pro vaši skupinu — například přípravu konkrétní akce nebo facilitovanou reflexi po prvním veřejném vystoupení. Kontakt: <a href="mailto:workshopy@nazemi.cz">workshopy@nazemi.cz</a>.</p>`,
  },
] as WorkshopSeed[]).map((workshop) => ({
  ...workshop,
  filters: buildWorkshopFilters(workshop.audienceTags, workshop.topicTags),
  href: getWorkshopHref(workshop.slug),
}))
