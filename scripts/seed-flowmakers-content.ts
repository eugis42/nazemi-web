/**
 * Seed Flowmakers content structure v1 (hero, nav, stránky, workshopy, lidé).
 *
 * Usage: npx tsx scripts/seed-flowmakers-content.ts
 *
 * Idempotent upsert by slug + site=flowmakers. Verbatim client copy from
 * flowmakers-structure-clean.md (Facilitace setkání + full Sebeřízení deferred).
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'
import config from '@payload-config'

import { richTextFromHtml } from '../src/seed/html'

type LexicalValue = Record<string, unknown>
type PageBlock = Record<string, unknown>
type PayloadClient = Awaited<ReturnType<typeof getPayload>>

const SITE_SLUG = 'flowmakers'
const MAIL = 'flowmakers@nazemi.cz'
const MAILTO = `mailto:${MAIL}`

const blockId = () => randomBytes(12).toString('hex')

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const p = (html: string) => `<p>${html}</p>`
const h2 = (t: string) => `<h2>${esc(t)}</h2>`
const h3 = (t: string) => `<h3>${esc(t)}</h3>`
const strongP = (t: string) => `<p><strong>${esc(t)}</strong></p>`
const emP = (t: string) => `<p><em>${esc(t)}</em></p>`

function ul(items: string[]) {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
}

function ol(items: string[]) {
  return `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`
}

function a(href: string, label: string) {
  return `<a href="${esc(href)}">${esc(label)}</a>`
}

function mailto(subject: string, label = 'Ozvěte se nám') {
  return a(`${MAILTO}?subject=${encodeURIComponent(subject)}`, label)
}

async function lex(html: string, payload: PayloadClient): Promise<LexicalValue> {
  return richTextFromHtml(html, payload) as Promise<LexicalValue>
}

async function upsertPage(
  payload: PayloadClient,
  siteId: number,
  data: { slug: string; title: string; excerpt: string; content: PageBlock[] },
) {
  const existing = await payload.find({
    collection: 'stranky',
    where: {
      and: [{ slug: { equals: data.slug } }, { site: { equals: siteId } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const body = {
    title: data.title,
    slug: data.slug,
    site: siteId,
    excerpt: data.excerpt,
    content: data.content,
    _status: 'published' as const,
    isHomepage: false,
  }
  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'stranky',
      id: existing.docs[0].id,
      data: body,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    console.log('page updated', data.slug, updated.id)
    return updated.id
  }
  const created = await payload.create({
    collection: 'stranky',
    data: body,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('page created', data.slug, created.id)
  return created.id
}

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

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

async function patchHero(payload: PayloadClient, siteId: number) {
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
  if (!page) throw new Error('Flowmakers homepage (domu) not found')

  const blocks = Array.isArray(page.homepageContent) ? [...page.homepageContent] : []
  let patched = false
  const next = blocks.map((raw) => {
    const b = { ...(raw as Record<string, unknown>) }
    if (b.blockType !== 'hero') return b
    patched = true
    const segments = Array.isArray(b.segments) ? [...(b.segments as Record<string, unknown>[])] : []
    if (segments[0]) {
      segments[0] = { ...segments[0], text: 'Méně tření. Více flow.' }
    } else {
      segments.push({ text: 'Méně tření. Více flow.', underline: '' })
    }
    b.segments = segments
    b.subheadline =
      'Facilitujeme důležité konverzace, designujeme procesy a rozvíjíme dovednosti, díky kterým může spolupráce ve vaší organizaci skutečně plynout.'
    return b
  })
  if (!patched) throw new Error('Homepage has no hero block')

  await payload.update({
    collection: 'stranky',
    id: page.id,
    data: { homepageContent: next as never },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('hero patched on domu', page.id)
}

/* -------------------------------------------------------------------------- */
/* Nav                                                                        */
/* -------------------------------------------------------------------------- */

async function replaceNav(payload: PayloadClient, siteId: number) {
  const mainMenu = [
    { label: 'Domů', linkType: 'external' as const, href: '/', depth: '0' },
    { label: 'Kalendář kurzů', linkType: 'external' as const, href: '/kalendar', depth: '0' },
    // Parent: no hub page — open first child; children carry the IA
    {
      label: 'Služby pro organizace',
      linkType: 'external' as const,
      href: '/facilitace',
      depth: '0',
    },
    { label: 'Facilitace', linkType: 'external' as const, href: '/facilitace', depth: '1' },
    { label: 'Workshopy', linkType: 'external' as const, href: '/workshopy', depth: '1' },
    {
      label: 'Nastavování procesů',
      linkType: 'external' as const,
      href: '/nastavovani-procesu',
      depth: '1',
    },
    { label: 'Konzultace', linkType: 'external' as const, href: '/konzultace', depth: '1' },
    {
      label: 'Podpora v sebeřízení',
      linkType: 'external' as const,
      href: '/seberizeni',
      depth: '0',
    },
    { label: 'O nás', linkType: 'external' as const, href: '/o-nas', depth: '0' },
    { label: 'Kontakt', linkType: 'external' as const, href: '/kontakt', depth: '0' },
  ]

  await payload.update({
    collection: 'sites',
    id: siteId,
    data: { mainMenu: mainMenu as never },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('nav replaced', mainMenu.length, 'items')
}

/* -------------------------------------------------------------------------- */
/* Contact (powers /kontakt route)                                            */
/* -------------------------------------------------------------------------- */

async function seedContactDetails(payload: PayloadClient, siteId: number) {
  await payload.update({
    collection: 'sites',
    id: siteId,
    data: {
      contactDetails: [
        {
          title: 'Flow Makers',
          email: MAIL,
          phone: '',
          note: 'Součást organizace NaZemi. Fakturační údaje na vyžádání.',
          extras: [
            { label: 'E-mail', value: MAIL },
            { label: 'Organizace', value: 'NaZemi, z. s.' },
          ],
        },
      ],
    } as never,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('contactDetails set →', MAIL)
}

/* -------------------------------------------------------------------------- */
/* Lide                                                                       */
/* -------------------------------------------------------------------------- */

const PEOPLE = [
  {
    slug: 'facilitator-placeholder-1',
    name: 'Facilitátor/ka (doplnit)',
    role: 'Facilitace · Flow Makers',
    sortOrder: 1,
  },
  {
    slug: 'facilitator-placeholder-2',
    name: 'Facilitátor/ka (doplnit)',
    role: 'Facilitace · Flow Makers',
    sortOrder: 2,
  },
  {
    slug: 'facilitator-placeholder-3',
    name: 'Facilitátor/ka (doplnit)',
    role: 'Facilitace · Flow Makers',
    sortOrder: 3,
  },
] as const

async function seedPeople(payload: PayloadClient, siteId: number) {
  for (const person of PEOPLE) {
    const existing = await payload.find({
      collection: 'lide',
      where: {
        and: [{ slug: { equals: person.slug } }, { site: { equals: siteId } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const data = {
      name: person.name,
      slug: person.slug,
      role: person.role,
      sortOrder: person.sortOrder,
      site: siteId,
      _status: 'published' as const,
    }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'lide',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log('lide updated', person.slug)
    } else {
      await payload.create({
        collection: 'lide',
        data,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log('lide created', person.slug)
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Stránky builders                                                           */
/* -------------------------------------------------------------------------- */

async function buildFacilitace(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const html = [
    p(
      'Facilitace je způsob práce se skupinou, který pomáhá lidem procházet společnou diskuzí způsobem, který posiluje vzájemné porozumění a důvěru, a současně umožňuje efektivní dosažení společného cíle. Facilitátor je vybavený postojem, dovednostmi a metodami, které umožní, aby jste se jako skupina lidí mohli pustit do projednávání otázek, u kterých jste si nebyli jistí kde začít, nebo si možná ani nedovedli představit, že v nich můžete najít shodu.',
    ),
    p('Ve FlowMakers vnímáme facilitaci jako praxi, která stojí na čtyřech pilířích:'),
    ul([
      '<strong>plné zapojení</strong> všech, kterých se téma týká,',
      '<strong>vzájemné porozumění</strong> místo mluvení přes sebe,',
      '<strong>inkluzivní řešení</strong>, která berou v potaz různé perspektivy,',
      '<strong>sdílenou odpovědnost</strong> za výsledek i další kroky.',
    ]),
    h2('Kam dál'),
    ul([
      `${a('/facilitace-velkych-akci', 'Facilitace velkých akcí')} — participativní formáty konferencí a velkých setkání.`,
      `${a('/kurzy-facilitace', 'Kurzy facilitace')} — 1-den, 3-den, Ateliér a workshop na míru.`,
    ]),
  ].join('\n')

  return {
    excerpt:
      'Facilitace je způsob práce se skupinou, který pomáhá lidem procházet společnou diskuzí způsobem, který posiluje porozumění a důvěru.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Facilitace je způsob práce se skupinou, který pomáhá lidem procházet společnou diskuzí způsobem, který posiluje vzájemné porozumění a důvěru, a současně umožňuje efektivní dosažení společného cíle.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildVelkeAkce(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const html = [
    p('Kolik konferencí jste zažili, kde:'),
    ul([
      'lidé po deseti minutách přestávají poslouchat,',
      'nejživější diskuze probíhají mimo sál,',
      'a skutečné otázky zazní až u kávy – když už je pozdě?',
    ]),
    p(
      '<strong>Pokud je to nejzajímavější, co se během konferencí děje, u coffee breaku, proč společným konverzacím nedat víc prostoru?</strong> Zvlášť když víme, kolik energie, času a péče stojí uspořádat akci, na kterou se sejde tolik lidí na jednom místě.',
    ),
    p(
      'S FlowMakers pomáháme dostat tyhle rozhovory z chodeb zpátky do programu. Navrhujeme a facilitujeme formáty, ve kterých se myšlenky <strong>rozproudí</strong>, lidé se zapojí a energie v místnosti začne téct mezi účastníky – ne jen z pódia dolů.',
    ),
    h2('Participativní formáty konferencí'),
    emP(
      'Když už lidi dostaneme na jedno místo, pojďme využít to nejcennější, co si přinášejí – sebe navzájem.',
    ),
    p(
      'Pomáháme organizátorům velkých akcí vytvářet programy, ve kterých účastníci nejsou jen publikem, ale <strong>spolutvůrci obsahu</strong>. Místo pasivního přijímání obsahu vzniká společný proces, kde se lidé slyší, reagují na sebe a postupně skládají celek z mnoha perspektiv.',
    ),
    p('Různými formáty skupinové práce vytváříme prostor pro:'),
    ul([
      '<strong>hlubší reflexi</strong> toho, co lidé na akci zažívají,',
      '<strong>výměnu pohledů a zkušeností</strong>, které by se jinak nepotkaly,',
      '<strong>zpracování témat</strong>, která by bez prostoru pro dialog zůstala pod povrchem.',
    ]),
    p(
      'Díky facilitaci se konference mění ze sledu prezentací na <strong>živý proud společného přemýšlení</strong>. Lidé se nejen dozví nové věci, ale <strong>prožijí pocit sounáležitosti, propojení a smyslu</strong> – a odnášejí si víc než poznámky: odnášejí si vztahy, otázky a energii pokračovat dál.',
    ),
    h2('Co participativní formáty lidem přinášejí'),
    ul([
      '<strong>Silnější pocit sounáležitosti a komunity</strong>',
      '<strong>Propojení lidí napříč rolemi, obory a zkušenostmi</strong>',
      '<strong>Větší vtáhnutí do obsahu a jeho hlubší porozumění</strong>',
      '<strong>Integraci toho, co zaznělo – ne jen zahlcení informacemi</strong>',
      '<strong>Prostor pro hlasy se žitou zkušeností, nejen pro expertní stanoviska</strong>',
    ]),
    p(
      'Z pasivních účastníků se stávají <strong>aktivní aktéři</strong>, kteří si z akce odnášejí nejen inspiraci, ale i vztahy, otázky a směr dalšího přemýšlení.',
    ),
    h2('Jak pracujeme'),
    p(
      'Jsme skupina <strong>11 facilitátorů a facilitátorek</strong> a máme navázanou spolupráci s dalšími kolegy a kolegyněmi. Díky tomu jsme schopni <strong>pokrýt akce s desítkami až stovkami účastníků</strong> a pracovat paralelně ve více skupinách.',
    ),
    p('Facilitaci vždy:'),
    ul([
      'navrhujeme na míru tématu a cíli akce,',
      'konzultujeme s organizátory předem,',
      'a realizujeme tak, aby program držel smysluplnou strukturu a zároveň zůstal živý a otevřený.',
    ]),
    h2('Ozvěte se nám'),
    p(
      'Pokud pořádáte velkou akci konferenčního formátu a chcete ji připravit tak, aby lidi svými diskuzemi spoluutvářeli obsah, nejen seděli a poslouchali, rádi se s vámi do toho pustíme.',
    ),
    p(`${mailto('Dotaz: Facilitace velkých akcí')} · ${esc(MAIL)}`),
    h2('Příběhy facilitovaných konferencí'),
    h3('Sociálně-ekologické fórum'),
    p(
      'SEF je jednodenní diskuzní fórum aktérů českého sociálně-ekologického hnutí od vědců přes politiky po aktivisty. Lidi, kteří se zabývají stejnými tématy z různých stran a konců. Naším úkolem bylo vytvořit prostředí, ve kterém budou mít příležitost slyšet zkušenosti a úhly pohledu, které obohatí jejich vlastní.',
    ),
    p('Program pro 80 lidí měl tři hlavní části'),
    ul([
      'inspirační prezentace - získání materiálu pro diskuzi',
      'vytvoření sedmi tématických diskuzních skupin, každá s jedním z našich facilitátorů',
      'výběr navazujících diskuzních témat, která navrhli sami účastníci akce podle toho, co s lidmi na akci chtěli prodiskutovat, znovu s podporou našich facilitátorů',
    ]),
    h3('Mezinárodní festival dokumentárních filmů Ji.hlava'),
    p(
      'MFDF Ji.hlava je desetidenní filmový festival, kde se návštěvníci mohou kromě promítání filmů účastnit i různých debat, přednášek a dalších doprovodných programů. Naše skupina pro festival realizovala během těch deseti dní třikrát program, během kterých mohli lidé přijít zamyslet se nad tím jaké otázky jim víří hlavou po tom všem, co na festivalu zažili a otázky, které měli chuť ještě dál zkoumat nabídnout všem účastníkům našeho programu k diskuzi. Skupina se následně dohodla, které ze všech těch nabídnutých otázek od všech účastníků je zajímají nejvíce a ty jsme poté v menších skupinách diskutovali. Naši facilitátoři v jednotlivých skupinách moderovali diskuzi a tvořili zápis pro ty, kteří se dané skupinky neúčastnili',
    ),
  ].join('\n')

  return {
    excerpt:
      'Navrhujeme a facilitujeme participativní formáty konferencí, ve kterých se myšlenky rozproudí mezi účastníky.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'S FlowMakers pomáháme dostat rozhovory z chodeb zpátky do programu — participativní formáty pro desítky až stovky lidí.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildKurzyFacilitace(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const html = [
    strongP('Facilitace jako dovednost, která drží týmy pohromadě.'),
    p('Organizace, které rozvíjejí facilitační dovednosti uvnitř týmů, dokážou:'),
    ul([
      'pracovat <strong>efektivněji</strong>, aniž by tlačily na výkon,',
      '<strong>dát hlas různým perspektivám</strong>, nejen těm nejsilnějším,',
      '<strong>vyrovnávat mocenské nerovnováhy</strong>, aby rozdíly v moci nebránily dialogu, ale vedly ke skutečnému partnerství.',
      'hledat řešení, která <strong>fungují pro celek</strong>, ne jen pro část lidí,',
      '<strong>udržovat pospolitost</strong> i ve chvílích napětí a nejistoty.',
    ]),
    h2('Jaké kurzy nabízíme'),
    ul([
      `${a('/workshopy/jak-na-vedeni-schuzek', '1-den – jak na vedení schůzek?')} — jak zvládnout vedení běžné, pracovní schůzky?`,
      `${a('/workshopy/uvod-do-facilitace', '3-den – úvod do facilitace')} — vstup do facilitace. Ukotvení v ucelené teorii, doprovázeno četnými tréninky.`,
      `${a('/workshopy/atelier-facilitace', 'Ateliér facilitace')} — pro ty, kteří se facilitaci již věnují a chtějí proniknout hlouběji. Nemá přesně stanovený obsah, ten se vytváří na základě přípravného callu s přihlášenými.`,
    ]),
    h2('Workshop na míru'),
    p(
      'Chcete, aby kurz přímo nasedal na vaše potřeby a situace, kterým často čelíte u vás v organizaci? Díky společnému rozhovoru vám pomůžeme identifikovat, které dovednosti či znalosti vám pomůžou v situacích, kterým čelíte. Na základě toho pak nadesignujeme rozsah a konkrétní obsah kurzu. Během kurzu budeme pracovat na modelových situacích přímo z vaší praxe. Kurz dokážeme flexibilně přizpůsobit aktuální situaci v rámci přípravy i během vlastního průběhu kurzu.',
    ),
    p('Možné témata k pokrytí:'),
    ul([
      'různé typy společného rozhodování',
      'design facilitací',
      'trénink konkrétních dovedností a zásahů - přerušování, parafráze, atd.',
      'práce s nerovným mocenským postavením ve skupině',
      'dvourole facilitátor - účastník',
    ]),
    p('Jak probíhají přípravy kurzu na míru:'),
    ol([
      'Bezplatná úvodní konzultace',
      'Nabídka vč. finální ceny a návrh termínů realizace kurzu',
      'Zmapování potřeb účastnické skupiny a upřesňující přípravné schůzky s lektorem kurzu',
      'Realizace školení podle vašich potřeb',
    ]),
    p(
      `${mailto('Poptávka: Workshop facilitace na míru', 'Poptat workshop na míru')} · ${esc(MAIL)}`,
    ),
  ].join('\n')

  return {
    excerpt:
      'Facilitace jako dovednost, která drží týmy pohromadě — 1-den, 3-den, Ateliér i kurz na míru.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead: 'Facilitace jako dovednost, která drží týmy pohromadě.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildNastavovaniProcesu(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const html = [
    h2('Podporujeme organizace v kultivaci klíčových systémů spolupráce'),
    strongP(
      '„Spolupráce je jeden z nejdůležitějších systémů organizace – a často ten nejméně vědomě navržený.“',
    ),
    p(
      'Systémy fungování v organizacích jsou vždy nějak žité. Otázkou je, zda jsme je nevědomky převzali, nebo je vědomě navrhli. A zda tyto systémy podporují spolupráci, nebo ji nenápadně podkopávájí. Jako FlowMakers pomáháme organizacím tyto systémy zviditelnit, designovat a vědomě rozvíjet.',
    ),
    p('<strong>Podporujeme organizace v nastavování struktur a procesů v 5 oblastech:</strong>'),
    ul([
      'rozhodování',
      'toky informací',
      'toky zdrojů a práce s kapacitou',
      'zpětná vazba',
      'řešení konfliktů',
    ]),
    p(
      '<strong>Pomáháme jak s jednotlivými oblastmi, tak s obecným nastavováním řízení.</strong>',
    ),
    p(`${mailto('Dotaz: Nastavování procesů', 'Kontaktujte nás')}.`),

    h2('Rozhodování'),
    p(
      'V mnoha organizacích se rozhodování děje, ale často není jasné jak, kým a na základě čeho. Nejasný systém rozhodování pak zpomaluje práci, zvyšuje napětí a vyčerpává lidi.',
    ),
    p('V praxi se to projevuje například takto:'),
    ul([
      'Rozhodnutí se zasekávají, protože není jasné, kdo má mandát je udělat.',
      'Rozhodnutí padne rychle shora, ale dole naráží na tichou rezistenci a neochotu ho naplno naplnit.',
      'Rozhoduje se příliš pomalu, protože se všichni snaží zapojit do všeho.',
      'Rozhodnutí vznikají bez dostatečných informací nebo kontextu, což vede k frustraci a opravám.',
      'Lidé se bojí rozhodovat, protože si nevěří.',
      'Rozhodování je závislé na několika klíčových lidech, kteří jsou přetížení nebo nedostupní.',
      'Rozhodnutí nevzniká díky dohodě, ale díky vyčerpání části týmu.',
    ]),
    h3('Jak s rozhodováním pomáháme'),
    h3('Zmapování současné praxe'),
    p(
      'Začínáme mapováním <strong>jak se u vás skutečně rozhoduje dnes</strong> a co to přináší. Jaká rozhodnutí se v organizaci dělají? Jakým způsobem a kdo rozhoduje? Co se s rozhodnutími děje dál? Často už samotné pojmenování nepsaných pravidel přináší úlevu a jasnost.',
    ),
    h3('Vědomý design rozhodovacího systému'),
    p(
      'Pomáháme organizacím ujasnit si, <strong>kdo o čem rozhoduje, koho je potřeba do rozhodnutí zapojit a jak se o rozhodnutích komunikuje dál</strong>. Umožňujeme rozlišit různé typy rozhodnutí - od rychlých operativních po strategická a citlivá - a volíme k nim odpovídající typ rozhodování.',
    ),
    p(
      'Tím, že jsou role, vstupy a způsoby rozhodování jasně pojmenované, <strong>rozhodování přestává být zdrojem napětí a nejistoty</strong>, a vzniká větší efektivita, zapojení, důvěra i skutečná odpovědnost.',
    ),
    h3('Rozvoj dovedností klíčových pro rozhodování'),
    p(
      'Skrze školení rozšiřujeme paletu rozhodovacích přístupů, které mohou týmy vědomě používat – od vyžádané rady po práci s námitkou. Učíme týmy nejen <em>jaký</em> typ rozhodování zvolit, ale taky <em>jak ho vést</em>. Učíme lidi vést rozhodovací procesy tak, aby dokázali integrovat různé potřeby a dojít k robustním rozhodnutím, ne k rozhodnutí silou nebo vyčerpáním.',
    ),

    h2('Tok informací'),
    p(
      'V mnoha organizacích informace proudí, ale ne vždy k těm správným lidem, ve správný čas a v použitelné podobě. Klíčovou otázkou systému toku informací je, jak zajistit aby všichni měli pro svou práci potřebné informace, aniž by byli zahlcení. Bez vědomě nastaveného toku informací se energie lidí vyčerpává v hledání, domněnkách a improvizaci místo v kvalitním rozhodování a práci.',
    ),
    p('V praxi se to často projevuje například takto:'),
    ul([
      'Schůzky se stávají místem pro všechno – sdílení, řešení i ventilaci – protože není jasné, kde jinde mají informace proudit.',
      'Důležité informace zůstávají u několika jednotlivců, kteří jsou v důsledku toho přetížení.',
      'Komunikační kanály (maily, chaty) jsou zahlcené zprávami, a zapadnou v nich pak i opravdu klíčové informace.',
      'Informace se sdílí pozdě, nebo až ve chvíli, kdy už je pozdě něco ovlivnit.',
      'Rozhodnutí a změny se dějí, ale jejich smysl a dopady nejsou jasně komunikované, což v organizaci způsobuje frustraci a zmatení.',
      'Týmy pracují s různými verzemi informací a vznikají nedorozumění a opravy.',
      'Lidé váhají sdílet informace otevřeně – z obavy z kritiky, zahlcení druhých nebo ztráty kontroly.',
    ]),
    h3('Jak s tokem informací pomáháme'),
    h3('Zmapování současné praxe'),
    p(
      'Začínáme tím, že společně zviditelníme, <strong>jak informace v organizaci skutečně proudí dnes</strong>. Co se sdílí kde? Co končí na schůzkách a proč? Jaké informace lidem chybí a kde se naopak ztrácí kapacita zahlcením?',
    ),
    h3('Vědomý design toku informací'),
    p(
      'Společně navrhujeme <strong>jasné a funkční dohody o tom, jaké informace mají proudit kudy, kdy a s jakým záměrem</strong>. Pomáháme rozlišovat mezi informováním, žádostí o vstup, sdílením kontextu a tématy, která skutečně patří na společné setkání. Facilitujeme diskuze o výběru komunikačních kanálů tak, aby co nejlépe naplňoval potřeby jednotlivců.',
    ),
    h3('Rozvoj dovedností práce s informacemi'),
    p(
      'Tok informací nestojí jen na nástrojích, ale na schopnosti lidí s nimi zacházet. Podporujeme týmy v tom, aby uměly informace <strong>sdílet s jasným záměrem, v přiměřené míře a ve správný čas</strong>, a aby se nebály otevřenosti tam, kde je pro práci důležitá.',
    ),
    p(
      'Díky tomu se informace stávají oporou pro rozhodování a spolupráci – ne zdrojem chaosu nebo kontroly.',
    ),

    // stubs only
    h2('Tok zdrojů'),
    p('<em>Obsah připravujeme.</em>'),

    h2('Zpětná vazba'),
    p(
      'Zpětná vazba je jedním z klíčových prostředků učení a rozvoje v organizacích. Přesto se jí lidé často vyhýbají a to jak při jejím dávání, tak přijímání. Ne proto, že by o ni nestáli, ale proto, že máme za sebou dlouhou zkušenost se zpětnou vazbou jako hodnocením a kritikou.',
    ),
    p(
      'Když tok zpětné vazby nefunguje, důležité informace o dopadech práce, spolupráci nebo napětí <strong>zůstávají nevyřčené</strong>. Místo učení se hromadí domněnky, nejistota a frustrace – a zpětná vazba se pak často objeví až ve chvíli, kdy už má podobu konfliktu.',
    ),
    p('V praxi se to projevuje například takto:'),
    ul([
      'Lidé si zpětnou vazbu nechávají pro sebe, aby „neudělali vlny“ nebo nikoho nezranili.',
      'Oceňující zpětná vazba téměř mizí, zatímco kritická má vysokou emoční nálož.',
      'Zpětná vazba se dává až ve chvíli, kdy je nahromaděné napětí příliš velké.',
      'Informace o tom, co nefunguje nebo co by šlo dělat jinak, se k relevantním lidem vůbec nedostanou.',
      'Lidé mají obavy zpětnou vazbu přijímat, berou ji osobně nebo se jí brání.',
      'Zpětná vazba je spojovaná s hodnocením výkonu, ne s učením a rozvojem.',
    ]),
    h3('Jak pomáháme s rozvíjením zpětné vazby'),
    h3('Rozvoj dovedností pro práci se zpětnou vazbou'),
    p(
      'Podporujeme lidi v tom, aby uměli zpětnou vazbu dávat i přijímat způsobem, který je srozumitelný, nehodnotící a posilující důvěru. Na našich workshopech se lidé učí pojmenovávat své pocity a potřeby a používat popisný jazyk místo hodnocení.',
    ),
    p(
      'Zvláštní pozornost věnujeme situacím, kde do zpětné vazby vstupuje moc – například když podřízený dává zpětnou vazbu nadřízenému, nebo když mladší žena mluví ke staršímu muži, či obráceně.',
    ),
    h3('Facilitace zpětnovazebních setkání'),
    p(
      'Facilitujeme zpětnovazební setkání jako bezpečný a strukturovaný prostor pro sdílení dopadů, napětí a učení. Externí facilitace pomáhá držet rámec, tempo i bezpečí. Zvlášť v náročných nebo emočně zatížených situacích.',
    ),
    p(
      'Díky tomu se lidé mohou slyšet i tam, kde by bez podpory zpětná vazba zůstala nevyřčená. Setkání umožňují říct věci, které by jinak lidé „spolkli“, a nenechat jejich dopady hromadit pod povrchem spolupráce.',
    ),

    h2('Řešení konfliktů'),
    p('<em>Obsah připravujeme.</em>'),
  ].join('\n')

  return {
    excerpt:
      'Pomáháme organizacím zviditelnit, designovat a vědomě rozvíjet systémy spolupráce — rozhodování, informace, zdroje, zpětná vazba, konflikty.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Podporujeme organizace v kultivaci klíčových systémů spolupráce.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildKonzultace(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const html = [
    p(
      'Potřebujete podpořit při přípravě facilitace nebo si nevíte rady se situacemi, které jsou při vedení skupin náročné? Využijte možnost konzultace se zkušeným facilitátorem. Společně projdeme to, co právě řešíte, zeptáme se na klíčové otázky a nabídneme vám ověřené postupy i praktické tipy, které můžete okamžitě využít.',
    ),
    p(
      'Z naší zkušenosti jsou individuální konzultace často nejrychlejší a nejefektivnější cestou, jak získat jistotu, posunout vlastní praxi a ušetřit čas i kapacity.',
    ),
    h2('Kdy má smysl požádat o konzultaci'),
    p(
      'Konzultace je vhodná ve chvíli, kdy si nejste jistí dalším krokem, řešíte složitou situaci v týmu nebo připravujete setkání, které je citlivé či důležité. Typicky například když:',
    ),
    ul([
      'se ve skupině opakovaně točí stejné téma bez posunu,',
      'potřebujete připravit workshop, poradu nebo setkání s více aktéry,',
      'cítíte napětí, nejasnosti nebo nevyřčené věci,',
      'chcete zapojit více hlasů a dojít ke společnému rozhodnutí.',
    ]),
    h2('Jak konzultace probíhá'),
    p(
      'Nejprve si společně ujasníme kontext, cíl a očekávání. Díváme se na situaci z různých úhlů a hledáme, co je teď skutečně potřeba — facilitace, změna struktury setkání, nebo jen zpřehlednění tématu. Výstupem je konkrétní návrh dalšího postupu nebo podoba facilitace na míru.',
    ),
    p('Chcete se poradit nebo zjistit, zda je pro vás facilitace vhodná?'),
    p(
      `Ozvěte se — první kontakt je nezávazný a slouží k ujasnění dalšího postupu. ${mailto('Dotaz: Konzultace facilitace')}`,
    ),
  ].join('\n')

  return {
    excerpt:
      'Individuální konzultace se zkušeným facilitátorem — příprava setkání, náročné situace ve skupině, další postup.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Potřebujete podpořit při přípravě facilitace nebo si nevíte rady se situacemi při vedení skupin?',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildSeberizeni(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  // Stub only — short shared blurb + CTAs into Služby
  const html = [
    h2('Co je to sebeřízení'),
    p(
      'Mnohé organizace dodnes stojí na hierarchii, příkazech a kontrole. Úspěšné organizace 21. století se učí fungovat jinak: na důvěře, autonomii, spoluodpovědnosti a jasných dohodách.',
    ),
    h2('Služby, které s tím souvisí'),
    ul([
      a('/facilitace', 'Facilitace'),
      a('/workshopy', 'Workshopy'),
      a('/nastavovani-procesu', 'Nastavování procesů'),
      a('/konzultace', 'Konzultace'),
    ]),
    p(`${mailto('Dotaz: Podpora v sebeřízení', 'Ozvěte se nám')}`),
  ].join('\n')

  return {
    excerpt:
      'Úspěšné organizace 21. století se učí fungovat na důvěře, autonomii, spoluodpovědnosti a jasných dohodách.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Mnohé organizace dodnes stojí na hierarchii, příkazech a kontrole. Úspěšné organizace 21. století se učí fungovat jinak: na důvěře, autonomii, spoluodpovědnosti a jasných dohodách.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

async function buildONas(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  const introHtml = [
    strongP(
      'Spolupráce je jeden z nejdůležitějších systémů organizace – a často ten nejméně vědomě navržený.',
    ),
    emP(
      'Ve FlowMakers pomáháme organizacím tento systém zviditelnit a kultivovat tak, aby energie lidí neodtékala, ale směřovala k dopadu. Skrze facilitaci, rozvoj dovedností a design organizačních systémů podporujeme způsoby práce, ve kterých se potkává autonomie jednotlivců s efektivitou, pospolitostí a flow v naplňování společných cílů.',
    ),
    p(
      'Kultivujeme nové formy spolupráce založené na vnitřní motivaci, důvěře, sdílené moci a respektu k potřebám. Věříme, že právě takové způsoby práce dnes organizace potřebují – nejen proto, aby fungovaly lépe, ale aby dokázaly reagovat na komplexní výzvy světa, ve kterém žijeme. <strong>Naše práce vychází z přesvědčení, že kvalita spolupráce zásadně ovlivňuje kvalitu společnosti.</strong> Pokud chceme širší společenskou změnu, potřebujeme proměňovat i to, jak lidé spolupracují tam, kde tráví většinu svého času.',
    ),
    h2('V čem jsme jiní'),
    p(
      'Patříme k těm, kteří nové formy spolupráce nejen předávají, ale sami je dlouhodobě žijí a testují v praxi. Samy už 7 let fungujeme jako sebeřídící organizace, bez šéfky, či manažerů. Víme, že skutečná změna nevzniká kopírováním hotových modelů, ale citlivým hledáním řešení v konkrétních podmínkách. Díky této zkušenosti dokážeme organizace provázet s jistotou i pokorou, opíráme se o to, co máme sami vyzkoušené, a zároveň respektujeme jedinečnost každého prostředí.',
    ),
    h2('Principy spolupráce, na kterých stavíme'),
    ul([
      'Potřeby jsou základním organizačním principem vzájemné spolupráce.',
      'Každý má možnost ovlivnit rozhodnutí, která se ho týkají.',
      'Zpětná vazba proudí všemi směry.',
      'Bezpečný prostor je živnou půdou pro odvahu a náročné konverzace.',
      'Každý může vstoupit do své síly a být lídrem.',
      'Moc bereme jako součást spolupráce – mluvíme o ní otevřeně a učíme se s ní zacházet vědomě a odpovědně.',
    ]),
    h2('Na jaké problémy reagujeme'),
    p(
      'Pracujeme s organizacemi, které narážejí na to, že stávající způsoby fungování přestávají stačit. Typicky se setkáváme s:',
    ),
    ul([
      'nedostatkem smyslu a vnitřní motivace,',
      'nekonečnými meetingy a pomalým rozhodováním,',
      'vyhořením a dlouhodobým přetížením,',
      'zneužíváním nebo skrýváním moci,',
      'neřešenými konflikty a tichým napětím,',
      'osamělostí lidí v týmech,',
      'tlakem na rychlá řešení bez hlubší změny,',
      'přemírou kontroly a nízkou důvěrou.',
    ]),
    p(
      'Nevěříme na zkratky. Věříme, že <strong>dlouhodobě funkční spolupráce vzniká tehdy, když se potká práce se systémy, dovednostmi i kulturou</strong>.',
    ),
    h2('Náš tým'),
    p(
      'V týmu kombinujeme různá východiska — facilitace, nenásilná komunikace, mediace, konstruktivistický přístup ke vzdělávání. Jsme post-růstová firma; všechny naše zisky tečou do organizace NaZemi.',
    ),
  ].join('\n')

  const peopleColumns = await Promise.all(
    PEOPLE.map(async (person) => ({
      body: await lex(
        `<h2>${esc(person.name)}</h2><p>${esc(person.role)}</p><p><em>Bio doplníme.</em></p>`,
        payload,
      ),
    })),
  )

  return {
    excerpt:
      'Kultivujeme nové formy spolupráce založené na vnitřní motivaci, důvěře, sdílené moci a respektu k potřebám.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Spolupráce je jeden z nejdůležitějších systémů organizace – a často ten nejméně vědomě navržený.',
      },
      { blockType: 'richText', content: await lex(introHtml, payload) },
      {
        blockType: 'threeColumns',
        title: 'Lidé Flow Makers',
        borders: true,
        columns: peopleColumns,
      },
    ],
  }
}

async function buildKontakt(payload: PayloadClient): Promise<{
  excerpt: string
  content: PageBlock[]
}> {
  // CMS mirror; live /kontakt route uses site.contactDetails + Lide
  const html = [
    h2('Flow Makers'),
    p(`E-mail: ${a(MAILTO, MAIL)}`),
    p('Součást organizace NaZemi. Fakturační údaje na vyžádání.'),
    p(`${mailto('Obecný dotaz Flow Makers', 'Napsat e-mail')}`),
  ].join('\n')

  return {
    excerpt: `Kontakt Flow Makers — ${MAIL}`,
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead: 'Ozvěte se nám — rádi se domluvíme na dalším postupu.',
      },
      { blockType: 'richText', content: await lex(html, payload) },
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* Workshopy                                                                  */
/* -------------------------------------------------------------------------- */

type WorkshopSeed = {
  slug: string
  title: string
  excerpt: string
  duration: string
  price: string
  topics: string[]
  audiences: string[]
  bodyHtml: string
  orderSubject: string
}

const WORKSHOPS: WorkshopSeed[] = [
  {
    slug: 'jak-na-vedeni-schuzek',
    title: '1-den – jak na vedení schůzek?',
    excerpt: 'Jak zvládnout vedení běžné, pracovní schůzky?',
    duration: '1 den',
    price: 'dle domluvy',
    topics: ['Facilitace', 'Dovednosti pro spolupráci'],
    audiences: ['Pro organizace'],
    orderSubject: 'Zájem o kurz: 1-den – jak na vedení schůzek?',
    bodyHtml: [
      emP('Jak zvládnout vedení běžné, pracovní schůzky?'),
      p(
        'Jednodenní kurz zaměřený na vedení běžných pracovních schůzek — struktura, zapojení hlasů, tempo a směřování k výstupu.',
      ),
      p(
        `Aktuální termíny najdete v ${a('/kalendar', 'kalendáři kurzů')}. Kurz na míru: ${mailto('Poptávka: Workshop na míru', 'napište nám')}.`,
      ),
    ].join('\n'),
  },
  {
    slug: 'uvod-do-facilitace',
    title: '3-den – úvod do facilitace',
    excerpt:
      'Vstup do facilitace. Ukotvení v ucelené teorii, doprovázeno četnými tréninky.',
    duration: '3 dny',
    price: 'dle domluvy',
    topics: ['Facilitace'],
    audiences: ['Pro organizace'],
    orderSubject: 'Zájem o kurz: 3-den – úvod do facilitace',
    bodyHtml: [
      emP('Vstup do facilitace. Ukotvení v ucelené teorii, doprovázeno četnými tréninky.'),
      p(
        'Třídenní úvod do facilitační praxe — postoj, dovednosti a metody, které drží týmy pohromadě při důležitých konverzacích.',
      ),
      p(
        `Více o nabídce: ${a('/kurzy-facilitace', 'Kurzy facilitace')}. ${mailto('Zájem o kurz: Úvod do facilitace', 'Ozvěte se')}.`,
      ),
    ].join('\n'),
  },
  {
    slug: 'atelier-facilitace',
    title: 'Ateliér facilitace',
    excerpt:
      'Pro ty, kteří se facilitaci již věnují a chtějí proniknout hlouběji. Obsah vzniká z přípravného callu.',
    duration: 'dle domluvy',
    price: 'dle domluvy',
    topics: ['Facilitace'],
    audiences: ['Pro organizace'],
    orderSubject: 'Zájem o kurz: Ateliér facilitace',
    bodyHtml: [
      emP(
        'Pro ty, kteří se facilitaci již věnují a chtějí proniknout hlouběji.',
      ),
      p(
        'Ateliér facilitace nemá přesně stanovený obsah — ten se vytváří na základě přípravného callu s přihlášenými, kde se domluví, co přesně konkrétní skupinu zajímá.',
      ),
      p(
        `Nevybrali jste si? ${mailto('Poptávka: Workshop na míru', 'Ozvěte se — připravíme kurz na míru')}.`,
      ),
    ].join('\n'),
  },
]

async function seedWorkshops(
  payload: PayloadClient,
  siteId: number,
  tagIds: Map<string, number>,
  audienceIds: Map<string, number>,
) {
  for (const w of WORKSHOPS) {
    const content = (await richTextFromHtml(w.bodyHtml, payload)) as LexicalValue
    const data: Record<string, unknown> = {
      _status: 'published',
      title: w.title,
      slug: w.slug,
      site: siteId,
      excerpt: w.excerpt,
      duration: w.duration,
      price: w.price,
      audiences: w.audiences.map((t) => audienceIds.get(t)).filter(Boolean),
      topics: w.topics.map((t) => tagIds.get(t)).filter(Boolean),
      blocks: [
        {
          blockType: 'richText',
          id: blockId(),
          content,
        },
      ],
      ctas: [
        {
          title: 'Mám zájem / domluvit',
          url: `${MAILTO}?subject=${encodeURIComponent(w.orderSubject)}`,
        },
      ],
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
      await payload.update({
        collection: 'workshopy',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log('workshop updated', w.slug)
    } else {
      await payload.create({
        collection: 'workshopy',
        data: data as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log('workshop created', w.slug)
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const payload = await getPayload({ config })

  const siteRes = await payload.find({
    collection: 'sites',
    where: { slug: { equals: SITE_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const siteId = siteRes.docs[0]?.id
  if (typeof siteId !== 'number') throw new Error('Flowmakers site not found')

  console.log('site', siteId, SITE_SLUG)

  await patchHero(payload, siteId)
  await seedContactDetails(payload, siteId)
  await seedPeople(payload, siteId)

  const tagIds = await resolveTagIds(payload, [
    'Facilitace',
    'Dovednosti pro spolupráci',
  ])
  const audienceIds = await resolveAudienceIds(payload, ['Pro organizace'])
  await seedWorkshops(payload, siteId, tagIds, audienceIds)

  const pages: {
    slug: string
    title: string
    build: (p: PayloadClient) => Promise<{ excerpt: string; content: PageBlock[] }>
  }[] = [
    { slug: 'facilitace', title: 'Facilitace', build: buildFacilitace },
    {
      slug: 'facilitace-velkych-akci',
      title: 'Facilitace velkých akcí',
      build: buildVelkeAkce,
    },
    { slug: 'kurzy-facilitace', title: 'Kurzy facilitace', build: buildKurzyFacilitace },
    {
      slug: 'nastavovani-procesu',
      title: 'Nastavování procesů',
      build: buildNastavovaniProcesu,
    },
    { slug: 'konzultace', title: 'Konzultace', build: buildKonzultace },
    { slug: 'seberizeni', title: 'Podpora v sebeřízení', build: buildSeberizeni },
    { slug: 'o-nas', title: 'O nás', build: buildONas },
    { slug: 'kontakt', title: 'Kontakt', build: buildKontakt },
  ]

  for (const page of pages) {
    const built = await page.build(payload)
    await upsertPage(payload, siteId, {
      slug: page.slug,
      title: page.title,
      excerpt: built.excerpt,
      content: built.content,
    })
  }

  // Nav after pages exist (hrefs are external paths — no relation needed)
  await replaceNav(payload, siteId)

  console.log('done')
  const q = '?site=flowmakers'
  for (const path of [
    '/',
    '/facilitace',
    '/facilitace-velkych-akci',
    '/kurzy-facilitace',
    '/nastavovani-procesu',
    '/konzultace',
    '/seberizeni',
    '/o-nas',
    '/kontakt',
    '/workshopy',
    '/workshopy/jak-na-vedeni-schuzek',
    '/workshopy/uvod-do-facilitace',
    '/workshopy/atelier-facilitace',
  ]) {
    console.log(`  http://localhost:3000${path}${q}`)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
