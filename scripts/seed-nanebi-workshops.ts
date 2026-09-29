/**
 * Seed NaNebi workshopy (8 bookable programs) + Programy nav + homepage CTAs.
 *
 * Usage: npx tsx scripts/seed-nanebi-workshops.ts
 *
 * Idempotent upsert by slug + site=nanebi. Softens cross-links to missing
 * „Příběhy lokální produkce“; wording otherwise from workshopy-nanebi.md.
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'
import config from '@payload-config'

import { richTextFromHtml } from '../src/seed/html'

type LexicalValue = Record<string, unknown>
type PayloadClient = Awaited<ReturnType<typeof getPayload>>

const MAILTO = 'mailto:nanebi@nazemi.cz'
const WORKSHOPY_HREF = '/workshopy'

const CTA_LABELS = [
  'Program a zapojení do dění',
  'Programy a workshopy',
  'Zapojte se do dění',
] as const

const YOUTH_TEAM = [
  {
    name: 'Tomáš Blaha',
    role: 'Lektor, člen spolku Hojnost',
  },
  {
    name: 'Tereza Kulhánková',
    role: 'Lektorka spolku Hojnost',
  },
  {
    name: 'NaZemi',
    role: 'Tým s expertní praxí v globálním a kritickém vzdělávání',
  },
] as const

const PETRA_BIO =
  'Petra Frühbauerová působí jako facilitátorka a lektorka v organizaci NaZemi. V současnosti se věnuje podpoře a posilování kolektivů a hnutí se snahou o horizontální organizaci. Zaměřuje se na nastavování sebeřídících systémů a procesů, řešení konfliktů způsobem, který posiluje a prohlubuje důvěru, či téma vědomého nakládání s nerovností a mocí ve skupinách.'

const TEREZA_BIO =
  'Tereza Kulhánková je jedna z členek týmu, který provozuje NaNebi. Tereza žije na Tišnovsku. Byla u zrodu první KPZky (komunitou podporovaného zemědělství) v okolí, zahradničí na komunitní zahrádce v Porta coeli, spoluzaložila neformální bioklub, z něhož vyrostl environmentální sociální podnik – bezobalová prodejna Tišnovská Spižírna. Pracuje v neziskové organizaci Hojnost, podílí se na životě Základní demokratické školy Colibri. V NaZemi je členkou facilitační skupiny a v NaNebi nejčastěji vaří. Její srdcovou záležitostí je provázení semináři community building.'

type WorkshopSeed = {
  slug: string
  title: string
  excerpt: string
  duration: string
  price: string
  groupSize?: string
  audiences: string[]
  topics: string[]
  takeaways: string[]
  coverKey: 'place' | 'team'
  speakers?: { name: string; role: string }[]
  bodyHtml: string
  orderSubject: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const p = (html: string) => `<p>${html}</p>`
const em = (t: string) => `<p><em>${esc(t)}</em></p>`
const strongP = (t: string) => `<p><strong>${esc(t)}</strong></p>`

function mailtoOrder(subject: string) {
  return `${MAILTO}?subject=${encodeURIComponent(subject)}`
}

/** School / youth programs + adult kolektivy — 8 rows. */
const WORKSHOPS: WorkshopSeed[] = [
  {
    slug: 'klima-a-my',
    title: 'Klima a my',
    excerpt:
      'Jak mluvíme o klimatické krizi? Kdo co tvrdí – a proč? A jak se v tom mám zorientovat?',
    duration: '3 h',
    price: '3600 Kč, či dle domluvy',
    audiences: ['Pro mladé', 'Pro vzdělavatele'],
    topics: ['Klima', 'Média', 'Kritické myšlení'],
    takeaways: [
      'rozlišují fakta, názory a hodnotové soudy v klimatické debatě',
      'dokáží analyzovat výroky o klimatu z hlediska zdrojů, zájmů a použitých argumentů',
      'rozvíjejí schopnost kritického myšlení, dialogu a respektující komunikace',
    ],
    coverKey: 'place',
    speakers: [...YOUTH_TEAM],
    orderSubject: 'Objednávka programu: Klima a my',
    bodyHtml: [
      em('Jak mluvíme o klimatické krizi? Kdo co tvrdí – a proč? A jak se v tom mám zorientovat?'),
      strongP(
        'Program je zaměřený na porozumění klimatické krizi skrze komunikaci, práci s výroky a mediální gramotnost.',
      ),
      p(
        'V první části studující zkoumají postoje ke klimatické krizi napříč jejich skupinou. Ve druhé části potom analyzují mediální výroky týkající se klimatické krize. Poslední část je zaměřena na vlastní orientaci v množství mediálních informací a osobní přístup k problému. Součástí je diskuze o tom, jak o klimatu mluvit smysluplně, srozumitelně a bez zjednodušování.',
      ),
      p(
        'Program se opírá o místní a konkrétní příklady, které mohou být kontroverzní a otevírat otázky typu: Je tohle opravdu „dobré pro životní prostředí“? Kdo to říká a na základě čeho? Inspirací jsou mj. místní iniciativy a situace v okolí NaNebi.',
      ),
      p(
        `<strong>Doporučujeme pro:</strong> dvoudenní pobyt v kombinaci s programem <em>Odpovědná ne(s)potřeba</em>, který dále prohlubuje kompetence mediální gramotnosti prostřednictvím kritického rozboru reklamy.`,
      ),
      p(
        `<strong>Klíčové pojmy:</strong> klimatická komunikace, mediální gramotnost, kritické myšlení, práce s informacemi, argumentace, framing, veřejná debata, dezinformace, role médií, společenské dopady klimatické krize`,
      ),
      p(`<strong>Varianty:</strong> 2. stupeň ZŠ | SŠ | mladí dospělí`),
    ].join('\n'),
  },
  {
    slug: 'systemove-mysleni',
    title: 'Systémové myšlení',
    excerpt:
      'Jak fungují malé i větší systémy okolo nás? Co se z nich můžeme naučit pro sebe i společnost? A co umí systémový myslitel?',
    duration: '3 h',
    price: '3600 Kč, či dle domluvy',
    audiences: ['Pro mladé', 'Pro vzdělavatele'],
    topics: ['Systémové myšlení', 'Vzdělávání'],
    takeaways: [
      'chápou rozdíl mezi izolovaným problémem a systémovým pohledem',
      'rozvíjejí schopnost přemýšlet o příčinách a důsledcích změn v systému',
      'dokáží identifikovat systémy ve svém okolí (přírodní, sociální, organizační)',
    ],
    coverKey: 'place',
    speakers: [...YOUTH_TEAM],
    orderSubject: 'Objednávka programu: Systémové myšlení',
    bodyHtml: [
      em(
        'Jak fungují malé i větší systémy okolo nás? Co se z nich můžeme naučit pro sebe i společnost? A co umí systémový myslitel?',
      ),
      strongP(
        'Vzdělávací program zaměřený na rozvoj systémového myšlení jako schopnosti nahlížet svět nikoli jako soubor izolovaných problémů, ale jako propojený celek vztahů, vazeb a dynamických procesů.',
      ),
      p(
        'Program podporuje porozumění komplexitě a nejistotě a ukazuje, že změna jedné části systému může ovlivnit celek – často nečekaným způsobem. Program nabízí srozumitelný terminologický úvod do systémového myšlení. Studující se seznamují s klíčovými pojmy, jako jsou systém, prvek, vztah, hranice systému, záměr systému a pákové body a učí se je používat při analýze reálných situací z každodenního života.',
      ),
      p(
        'Lekce je postavena na pozorování a identifikaci systémů i v okolí NaNebi – přírodních, sociálních i organizačních. Studující zkoumají, z čeho se systémy skládají, jaké mají vazby, kde mají hranice a jak se mění v čase. Na konkrétních příkladech si osvojují základní metody systémové analýzy, které pomáhají lépe porozumět složitým problémům a hledat smysluplná a dlouhodobá řešení.',
      ),
      p(
        'Program rozvíjí schopnost vidět souvislosti, pracovat s komplexitou a přenášet systémové myšlení do běžného života, mezilidských vztahů i širších společenských a environmentálních témat.',
      ),
      p(
        `<strong>Doporučujeme pro:</strong> dvoudenní pobyt v kombinaci s programem <em>Růst či nerůst</em>, který metody systémové myšlení uvádí do praktické roviny.`,
      ),
      p(
        `<strong>Klíčové pojmy:</strong> systémové myšlení, systém, prvek systému, vztahy a vazby, hranice systému, pákové body, dynamika systému, změna v čase, komplexita`,
      ),
      p(`<strong>Varianty:</strong> SŠ | mladí dospělí`),
    ].join('\n'),
  },
  {
    slug: 'odpovedna-nespotreba',
    title: 'Odpovědná ne(s)potřeba',
    excerpt:
      'Podle čeho si vybírám, když nakupuji? Jak rozlišit skutečné potřeby od marketingových strategií?',
    duration: '3 h',
    price: '3600 Kč, či dle domluvy',
    audiences: ['Pro mladé', 'Pro vzdělavatele'],
    topics: ['Spotřeba', 'Greenwashing', 'Odpovědná spotřeba'],
    takeaways: [
      'rozlišují mezi skutečnými a uměle vytvořenými potřebami',
      'chápou roli marketingu, reklamy a médií při formování spotřebního chování',
    ],
    coverKey: 'place',
    speakers: [...YOUTH_TEAM],
    orderSubject: 'Objednávka programu: Odpovědná ne(s)potřeba',
    bodyHtml: [
      em(
        'Podle čeho si vybírám, když nakupuji? Jak rozlišit skutečné potřeby od marketingových strategií?',
      ),
      strongP(
        'Workshop rozvíjí kompetence pro mediální gramotnost prostřednictvím kritické práce s reklamou.',
      ),
      p(
        'Studující se seznámí s pojmem greenwashing, s greenwashingovými praktikami a s širším kontextem, ve kterém tyto praktiky probíhají. Odhalují prvky greenwashingu na konkrétních reklamách.',
      ),
      p(
        'Program se dále zaměřuje na rozlišení mezi potřebami a strategiemi a hledá různorodé způsoby, jak potřeby naplňovat. Program pracuje s konkrétními příklady z okolí NaNebi i z každodenního života studujících.',
      ),
      p(
        `<strong>Doporučujeme pro:</strong> dvoudenní pobyt v kombinaci s programem <em>Růst či nerůst</em> pro širší společenský kontext; či s programem <em>Klima a my</em> pro prohloubení mediální gramotnosti.`,
      ),
      p(
        `<strong>Klíčové pojmy:</strong> spotřeba a potřeby, mediální výchova, kritické myšlení, marketingové strategie, reklama, greenwashing, aktéři spotřebního trhu, udržitelnost, společenské narativy, odpovědná spotřeba`,
      ),
      p(`<strong>Varianty:</strong> SŠ | mladí dospělí`),
    ].join('\n'),
  },
  {
    slug: 'rust-ci-nerust',
    title: 'Růst, či nerůst?',
    excerpt:
      'Co opravdu potřebujeme a jak se naše volby promítají do světa kolem nás?',
    duration: '3 h',
    price: '3600 Kč, či dle domluvy',
    audiences: ['Pro mladé', 'Pro vzdělavatele'],
    topics: ['Nerůst', 'Spotřeba'],
    takeaways: [
      'rozumějí pojmu planetární hranice a jeho významu pro lidskou společnost',
      'dokáží pojmenovat limity současného ekonomického modelu',
      'chápou rozdíl mezi ekonomickým růstem a skutečným blahobytem',
    ],
    coverKey: 'place',
    speakers: [...YOUTH_TEAM],
    orderSubject: 'Objednávka programu: Růst, či nerůst?',
    bodyHtml: [
      em('Co opravdu potřebujeme a jak se naše volby promítají do světa kolem nás?'),
      strongP(
        'Workshop propojuje participativní aktivity, diskusi a krátkou přednášku a zkoumá, zda můžeme v současnosti dosáhnout společenského blahobytu (a za jakou cenu).',
      ),
      p(
        'Studující se seznamují s tím, jak současný model nekonečného ekonomického růstu naráží na planetární hranice a proč tradiční ukazatele prosperity (např. HDP) často selhávají při popisu skutečného blahobytu. Hravou a srozumitelnou formou zkoumají, co všechno se do těchto měření nevejde – kvalita vztahů, zdraví, pocit bezpečí, smysluplnost práce či stav životního prostředí.',
      ),
      p(
        'Lekce podporuje reflexi vlastních potřeb a volby, ukazuje, jak je možné je naplňovat smysluplně a udržitelně, a představuje konkrétní funkční iniciativy v okolí NaNebi a kláštera, jako inspiraci pro vlastní akce i občanská a spotřebitelská rozhodnutí.',
      ),
      p(
        `<strong>Doporučujeme pro:</strong> dvoudenní pobyt v kombinaci s programy <em>Odpovědná ne(s)potřeba</em> či <em>Systémové myšlení</em>, které prohlubují schopnost přemýšlet o aktuálních tématech v souvislostech.`,
      ),
      p(
        `<strong>Klíčové pojmy:</strong> potřeby a blahobyt, planetární hranice, ekonomický růst, udržitelnost, alternativní ukazatele blahobytu, spotřeba, limity růstu, lokální iniciativy, dobrý život`,
      ),
      p(`<strong>Varianty:</strong> SŠ | mladí dospělí`),
      p(
        '<em>Potřebujete upravit cenu podle vašich možností? Program podle vašich preferencí? Nebo hledáte termín? Ozvěte se – rádi program přizpůsobíme vašim potřebám. (Cena by neměla být překážkou pro účast. Nabízíme také omezený počet pilotních lekcí, které předpokládají zpětnou vazbu od pedagogického doprovodu.)</em>',
      ),
    ].join('\n'),
  },
  {
    slug: 'nove-pribehy-porta-coeli',
    title: 'Nové příběhy z Porta coeli: komentovaná procházka',
    excerpt:
      'Jak se dělají lokální komunitní iniciativy (v prostředí kláštera)? Čím a z čeho žijí lidé kolem nich?',
    duration: '1,5 h',
    price: 'od 1500 Kč dle rozsahu a další domluvy',
    groupSize: 'do 15 osob',
    audiences: ['Pro organizace', 'Pro veřejnost'],
    topics: ['Komunita', 'Udržitelnost', 'Potraviny'],
    takeaways: [],
    coverKey: 'place',
    speakers: [{ name: 'Tereza Kulhánková', role: 'Garantka programu' }],
    orderSubject: 'Objednávka: Nové příběhy z Porta coeli',
    bodyHtml: [
      em(
        'Jak se dělají lokální komunitní iniciativy (v prostředí kláštera)? Čím a z čeho žijí lidé kolem nich?',
      ),
      p(
        'Procházka se zastaveními určená těm, kteří chtějí nahlédnout tak trochu pod pokličku a dozvědět se víc o společensky inovativních a environmentálně šetrných iniciativách, které v areálu kláštera našly své místo pro život. Jak vzniklo NaNebi a kdo ho tvoří? Jak se organizuje tzv. KPZ zahrádka a co je vlastně komunitou podporované zemědělství? Jak vyčistit od náletů několik hektarů sadů, které vám nepatří? Co dělají děti ve svobodné demokratické škole Colibri a kde se potkávají vegani s myslivci? I to mohou být otázky, na které v Porta coeli můžete najít odpovědi.',
      ),
      p(`<strong>Určeno pro:</strong> skupina dospělých do 15 osob`),
      `<h3>Garantka programu</h3>`,
      p(esc(TEREZA_BIO)),
    ].join('\n'),
  },
  {
    slug: 'seberizeni-tymu',
    title: 'Workshop sebeřízení týmů',
    excerpt:
      'Seznámení s principy sebeřídícího fungování založeném na sdílené moci, které často využívají horizontálně uspořádané organizace.',
    duration: '3–6 h',
    price: 'od 5 300 Kč dle rozsahu a další domluvy',
    audiences: ['Pro organizace'],
    topics: ['Sebeřízení', 'Dovednosti pro spolupráci'],
    takeaways: [],
    coverKey: 'team',
    speakers: [{ name: 'Petra Frühbauerová', role: 'Garantka programu' }],
    orderSubject: 'Objednávka workshopu: Sebeřízení týmů',
    bodyHtml: [
      p(
        'Záměrem workshopu je seznámit se s principy sebeřídícího fungování založeném na sdílené moci, které často využívají horizontálně uspořádané organizace. Vytvoříme si společné informační zázemí a jazyk pro to se o tématu fungování bavit ve vlastních kolektivech. Na základě konkrétních příkladů formulujeme, na jakých východiscích a hodnotách stojí sebeřízení a jak se následně projevuje v různých oblastech organizačních procesů tak, aby posilovalo společnou odpovědnost, udržitelné fungování a naplňování potřeb všech.',
      ),
      p(
        `<strong>Určeno pro:</strong> týmy lidí usilující o společný cíl, pracovní kolektivy, vzdělávací akce pro dospělé`,
      ),
      `<h3>Garantka programu</h3>`,
      p(esc(PETRA_BIO)),
    ].join('\n'),
  },
  {
    slug: 'facilitace',
    title: 'Workshop facilitace',
    excerpt:
      'Základní prvky facilitace, facilitační dovednosti, metody a nástroje pro přípravu a vedení efektivních setkání.',
    duration: '3–12 h',
    price: 'od 5 300 Kč dle rozsahu a další domluvy',
    audiences: ['Pro organizace'],
    topics: ['Facilitace', 'Facilitační dovednosti', 'Vedení schůzek'],
    takeaways: [],
    coverKey: 'team',
    speakers: [{ name: 'Petra Frühbauerová', role: 'Garantka programu' }],
    orderSubject: 'Objednávka workshopu: Facilitace',
    bodyHtml: [
      p(
        'Co je to vlastně facilitace? Co cenného může přinést do průběhu našich schůzek a porad? Jak můžeme posilovat naše dovednosti potřebné pro dobrou přípravu a vedení pohodových a efektivních setkání? V rámci workshopu se seznámíme se základními prvky facilitace. Budeme ohledávat facilitátorskou roli a přiblížíme si jednotlivé facilitační dovednosti, metody a nástroje. Věnovat se budeme různým postupům, které nám umožňují pracovat s potenciálem skupiny a její dynamikou. Zjistíme, co může skupinový proces blokovat, ale zejména jak se z podobných situací dostat ven a podporovat ve skupině partnerský přístup a spolupráci. Vytvoříme prostor pro zkoumání vlastních facilitátorských kvalit a limitů, včetně praktických nácviků facilitace.',
      ),
      p(
        `<strong>Určeno pro:</strong> týmy lidí usilující o společný cíl, pracovní kolektivy, vzdělávací akce pro dospělé`,
      ),
      `<h3>Garantka programu</h3>`,
      p(esc(PETRA_BIO)),
    ].join('\n'),
  },
  {
    slug: 'zpetna-vazba',
    title: 'Workshop zpětné vazby',
    excerpt:
      'Zpětná vazba jako společné zkoumání — dovednosti pro poskytování i přijímání, popisný jazyk a jazyk pocitů a potřeb z nenásilné komunikace.',
    duration: '3–6 h',
    price: 'od 5 300 Kč dle rozsahu a další domluvy',
    audiences: ['Pro organizace'],
    topics: ['Nenásilná komunikace', 'Dovednosti pro spolupráci'],
    takeaways: [],
    coverKey: 'team',
    speakers: [{ name: 'Petra Frühbauerová', role: 'Garantka programu' }],
    orderSubject: 'Objednávka workshopu: Zpětná vazba',
    bodyHtml: [
      p(
        'V rámci workshopu se zaměříme na porozumění zpětné vazbě jako společnému zkoumání, které umožňuje růst osobní i kolektivu. Posílíme dovednosti pro poskytování i přijímání zpětné vazby, seznámíme se s popisným jazykem a s jazykem pocitů a potřeb vycházejícím z nenásilné komunikace. Vytvoříme prostor pro trénink poskytování zpětné vazby na situacích z vašeho života. Můžeme se věnovat i reflexi plynutí zpětné vazby v kolektivu a nastavování funkčních nástrojů k jeho posílení jako něčeho přirozeného, co je součástí každodenního fungování.',
      ),
      p(
        `<strong>Určeno pro:</strong> týmy lidí usilující o společný cíl, pracovní kolektivy, vzdělávací akce pro dospělé`,
      ),
      `<h3>Garantka programu</h3>`,
      p(esc(PETRA_BIO)),
    ].join('\n'),
  },
]

async function resolveTagIds(payload: PayloadClient, titles: string[]) {
  const map = new Map<string, number>()
  for (const title of titles) {
    const found = await payload.find({
      collection: 'tags',
      where: { title: { equals: title } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const id = found.docs[0]?.id
    if (typeof id !== 'number') throw new Error(`Missing tag: ${title}`)
    map.set(title, id)
  }
  return map
}

async function resolveAudienceIds(payload: PayloadClient, titles: string[]) {
  const map = new Map<string, number>()
  for (const title of titles) {
    const found = await payload.find({
      collection: 'workshop-audiences',
      where: { title: { equals: title } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const id = found.docs[0]?.id
    if (typeof id !== 'number') throw new Error(`Missing audience: ${title}`)
    map.set(title, id)
  }
  return map
}

async function resolveHomepageCovers(payload: PayloadClient) {
  // Images already used on NaNebi homepage (hero gallery + about).
  const place = await payload.find({
    collection: 'media',
    where: { filename: { equals: '20240413_110223-1024x768.jpg' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const team = await payload.find({
    collection: 'media',
    where: { filename: { equals: 'about-team.jpg' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const placeId = place.docs[0]?.id
  const teamId = team.docs[0]?.id
  if (typeof placeId !== 'number') {
    console.warn('cover place image missing — workshops may ship without cover')
  }
  if (typeof teamId !== 'number') {
    console.warn('cover team image missing — adult workshops may ship without cover')
  }
  return {
    place: typeof placeId === 'number' ? placeId : null,
    team: typeof teamId === 'number' ? teamId : null,
  }
}

async function seedWorkshops(
  payload: PayloadClient,
  siteId: number,
  tagIds: Map<string, number>,
  audienceIds: Map<string, number>,
  covers: { place: number | null; team: number | null },
) {
  const results: { slug: string; id: number | string; action: string }[] = []

  for (const w of WORKSHOPS) {
    const coverId = covers[w.coverKey]
    const content = (await richTextFromHtml(w.bodyHtml, payload)) as LexicalValue
    const blocks: Record<string, unknown>[] = [
      {
        blockType: 'richText',
        id: randomBytes(12).toString('hex'),
        content,
      },
    ]
    if (w.speakers?.length) {
      blocks.push({
        blockType: 'speakers',
        id: randomBytes(12).toString('hex'),
        title: 'Lektoři a facilitátoři',
        people: w.speakers.map((s) => ({ name: s.name, role: s.role })),
      })
    }

    const data: Record<string, unknown> = {
      _status: 'published',
      title: w.title,
      slug: w.slug,
      site: siteId,
      excerpt: w.excerpt,
      duration: w.duration,
      price: w.price,
      ...(w.groupSize ? { groupSize: w.groupSize } : {}),
      audiences: w.audiences.map((t) => audienceIds.get(t)).filter(Boolean),
      topics: w.topics.map((t) => tagIds.get(t)).filter(Boolean),
      takeaways: w.takeaways.map((item) => ({ item })),
      blocks,
      ctas: [
        {
          title: 'Objednat / domluvit termín',
          url: mailtoOrder(w.orderSubject),
        },
      ],
      ...(coverId ? { coverImage: coverId } : {}),
    }

    const existing = await payload.find({
      collection: 'workshopy',
      where: {
        and: [{ slug: { equals: w.slug } }, { site: { equals: siteId } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      const updated = await payload.update({
        collection: 'workshopy',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      results.push({ slug: w.slug, id: updated.id, action: 'updated' })
      console.log('updated', w.slug, updated.id)
    } else {
      const created = await payload.create({
        collection: 'workshopy',
        data: data as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      results.push({ slug: w.slug, id: created.id, action: 'created' })
      console.log('created', w.slug, created.id)
    }
  }

  return results
}

async function ensureProgramyMenu(payload: PayloadClient, siteId: number) {
  const site = await payload.findByID({
    collection: 'sites',
    id: siteId,
    depth: 0,
    overrideAccess: true,
  })
  const menu = Array.isArray(site.mainMenu) ? [...site.mainMenu] : []
  const idx = menu.findIndex(
    (item) => typeof item?.label === 'string' && item.label.trim() === 'Programy',
  )

  const programyItem = {
    label: 'Programy',
    linkType: 'external' as const,
    href: WORKSHOPY_HREF,
    depth: 0,
  }

  if (idx >= 0) {
    menu[idx] = { ...menu[idx], ...programyItem }
  } else {
    menu.push(programyItem)
  }

  await payload.update({
    collection: 'sites',
    id: siteId,
    data: { mainMenu: menu as never },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('menu Programy →', WORKSHOPY_HREF, idx >= 0 ? '(updated)' : '(added)')
}

type ActionRow = {
  label?: string | null
  href?: string | null
  linkType?: string | null
  reference?: unknown
  [key: string]: unknown
}

function retargetActions(actions: unknown): { actions: ActionRow[]; hits: string[] } {
  if (!Array.isArray(actions)) return { actions: [], hits: [] }
  const hits: string[] = []
  const next = actions.map((raw) => {
    const a = { ...(raw as ActionRow) }
    const label = typeof a.label === 'string' ? a.label.trim() : ''
    if ((CTA_LABELS as readonly string[]).includes(label)) {
      hits.push(label)
      a.linkType = 'external'
      a.href = WORKSHOPY_HREF
      a.reference = null
    }
    return a
  })
  return { actions: next, hits }
}

async function retargetHomepageCtas(payload: PayloadClient, siteId: number) {
  const pages = await payload.find({
    collection: 'stranky',
    where: {
      and: [{ site: { equals: siteId } }, { isHomepage: { equals: true } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages.docs[0]
  if (!page) throw new Error('NaNebi homepage not found')

  const blocks = Array.isArray(page.homepageContent) ? [...page.homepageContent] : []
  const allHits: string[] = []

  const nextBlocks = blocks.map((block) => {
    const b = { ...(block as Record<string, unknown>) }
    if (b.blockType === 'threeColumns' && Array.isArray(b.columns)) {
      b.columns = (b.columns as Record<string, unknown>[]).map((col) => {
        const c = { ...col }
        const { actions, hits } = retargetActions(c.actions)
        if (hits.length) {
          allHits.push(...hits)
          c.actions = actions
        }
        return c
      })
    }
    if (b.blockType === 'about' || b.blockType === 'hero' || b.blockType === 'pillars') {
      const { actions, hits } = retargetActions(b.actions)
      if (hits.length) {
        allHits.push(...hits)
        b.actions = actions
      }
    }
    return b
  })

  await payload.update({
    collection: 'stranky',
    id: page.id,
    data: { homepageContent: nextBlocks as never },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

  const unique = [...new Set(allHits)]
  console.log(
    'homepage CTAs →',
    WORKSHOPY_HREF,
    unique.length ? unique.join(', ') : '(no matching labels found)',
  )
  return unique
}

async function main() {
  const payload = await getPayload({ config })

  const siteRes = await payload.find({
    collection: 'sites',
    where: { slug: { equals: 'nanebi' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const siteId = siteRes.docs[0]?.id
  if (typeof siteId !== 'number') throw new Error('NaNebi site not found')

  const allTopics = [...new Set(WORKSHOPS.flatMap((w) => w.topics))]
  const allAudiences = [...new Set(WORKSHOPS.flatMap((w) => w.audiences))]
  const tagIds = await resolveTagIds(payload, allTopics)
  const audienceIds = await resolveAudienceIds(payload, allAudiences)
  const covers = await resolveHomepageCovers(payload)

  console.log('site', siteId, 'tags', tagIds.size, 'audiences', audienceIds.size)

  const workshops = await seedWorkshops(payload, siteId, tagIds, audienceIds, covers)
  await ensureProgramyMenu(payload, siteId)
  const ctaHits = await retargetHomepageCtas(payload, siteId)

  console.log('done')
  console.log(
    `  workshops: ${workshops.length} (${workshops.map((w) => w.slug).join(', ')})`,
  )
  console.log(`  CTAs retargeted: ${ctaHits.length}`)
  console.log('  http://localhost:3000/workshopy?site=nanebi')
  console.log('  http://localhost:3000/workshopy/klima-a-my?site=nanebi')
  console.log('  http://localhost:3000/?site=nanebi')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
