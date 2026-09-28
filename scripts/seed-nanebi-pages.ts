/**
 * Populate NaNebi pages O nás / Ubytování / Stravování from markdown sources.
 *
 * Usage: npx tsx scripts/seed-nanebi-pages.ts
 *
 * Idempotent upsert by slug + site=nanebi. Keeps source wording; structures
 * page blocks + Lexical (lists, links, bold, expanding paragraphs, logoStrip).
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import config from '@payload-config'

import { richTextFromHtml } from '../src/seed/html'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, 'data/nanebi-pages')

const FUNDER_FILES = [
  'nanebi-onas-image1.png',
  'nanebi-onas-image2.png',
  'nanebi-onas-image3.png',
  'nanebi-onas-image4.png',
] as const

type LexicalValue = Record<string, unknown>
type PageBlock = Record<string, unknown>

const blockId = () => randomBytes(12).toString('hex')

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Minimal markdown → HTML (links, bold, italic, paragraphs, headings, lists). */
function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let inUl = false
  let inOl = false

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }

  const inline = (text: string) => {
    let t = esc(text)
    // links [label](url) — after esc so []() stay literal
    t = t.replace(
      /\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>',
    )
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    t = t.replace(/___+/g, '<hr />')
    return t
  }

  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      closeLists()
      i += 1
      continue
    }

    if (trimmed === '---') {
      closeLists()
      out.push('<hr />')
      i += 1
      continue
    }

    const h = trimmed.match(/^(#{1,6})\s+\*?\*?(.+?)\*?\*?\s*$/)
    if (h) {
      closeLists()
      const level = Math.min(h[1]!.length, 3)
      out.push(`<h${level}>${inline(h[2]!.replace(/\*\*/g, ''))}</h${level}>`)
      i += 1
      continue
    }

    // bold-only heading lines like **Podmínky**
    const boldHead = trimmed.match(/^\*\*(.+)\*\*$/)
    if (boldHead && !trimmed.includes('  ')) {
      closeLists()
      out.push(`<h2>${inline(boldHead[1]!)}</h2>`)
      i += 1
      continue
    }

    const ul = trimmed.match(/^[-*]\s+(.+)$/)
    if (ul) {
      if (inOl) {
        out.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        out.push('<ul>')
        inUl = true
      }
      // nested bullets (two-space / four-space indent in source uses "  *")
      out.push(`<li>${inline(ul[1]!)}</li>`)
      i += 1
      continue
    }

    // Nested list items that start with spaces then *
    const nested = raw.match(/^\s{2,}\*\s+(.+)$/)
    if (nested) {
      if (!inUl) {
        out.push('<ul>')
        inUl = true
      }
      out.push(`<li>${inline(nested[1]!)}</li>`)
      i += 1
      continue
    }

    closeLists()
    // Accumulate paragraph until blank
    const parts: string[] = [trimmed]
    i += 1
    while (i < lines.length && lines[i]!.trim()) {
      const next = lines[i]!.trim()
      if (
        next.startsWith('#') ||
        next.startsWith('- ') ||
        next.startsWith('* ') ||
        next === '---' ||
        /^\*\*[^*]+\*\*$/.test(next)
      ) {
        break
      }
      if (/^\s{2,}\*\s+/.test(lines[i]!)) break
      parts.push(next)
      i += 1
    }
    out.push(`<p>${inline(parts.join(' '))}</p>`)
  }
  closeLists()
  return out.join('\n')
}

async function lex(html: string, payload: Awaited<ReturnType<typeof getPayload>>) {
  return richTextFromHtml(html, payload)
}

function lexicalBlock(
  blockType: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: 'block',
    format: '',
    version: 2,
    fields: {
      id: blockId(),
      blockName: '',
      blockType,
      ...fields,
    },
  }
}

function appendNodes(doc: LexicalValue, nodes: Record<string, unknown>[]) {
  const root = doc.root as { children?: unknown[] }
  if (!root.children) root.children = []
  root.children.push(...nodes)
  return doc
}

/** Lexical text node; optional TextStateFeature colour token (e.g. extra-0). */
function lexText(text: string, color?: string): Record<string, unknown> {
  const node: Record<string, unknown> = {
    type: 'text',
    text,
    mode: 'normal',
    style: '',
    detail: 0,
    format: 0,
    version: 1,
  }
  if (color) node.$ = { color }
  return node
}

/**
 * Ubytování card pattern (Norbert template):
 * H2 = accent name + linebreak + capacity; H3 = price; then body nodes from markdown.
 */
async function roomCardBody(
  payload: Awaited<ReturnType<typeof getPayload>>,
  opts: { name: string; capacity: string; price: string; bodyMd: string },
): Promise<LexicalValue> {
  const body = await lex(mdToHtml(opts.bodyMd), payload)
  const bodyKids = ((body.root as { children?: unknown[] })?.children || []) as unknown[]
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          tag: 'h2',
          type: 'heading',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            lexText(opts.name, 'extra-0'),
            { type: 'linebreak', version: 1 },
            lexText(opts.capacity),
          ],
        },
        {
          tag: 'h3',
          type: 'heading',
          format: '',
          indent: 0,
          version: 1,
          direction: null,
          children: [lexText(opts.price)],
        },
        ...bodyKids,
      ],
    },
  }
}

async function ensureFunderMedia(payload: Awaited<ReturnType<typeof getPayload>>) {
  const ids: number[] = []
  for (const filename of FUNDER_FILES) {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = found.docs[0]?.id
    if (typeof id !== 'number') {
      throw new Error(`Missing funder media file: ${filename}`)
    }
    ids.push(id)
  }
  return ids
}

async function upsertPage(
  payload: Awaited<ReturnType<typeof getPayload>>,
  siteId: number,
  data: {
    slug: string
    title: string
    excerpt: string
    content: PageBlock[]
  },
) {
  const existing = await payload.find({
    collection: 'stranky',
    where: {
      and: [{ slug: { equals: data.slug } }, { site: { equals: siteId } }],
    },
    limit: 1,
    depth: 0,
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
    console.log('updated', data.slug, updated.id)
    return updated.id
  }
  const created = await payload.create({
    collection: 'stranky',
    data: body,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  console.log('created', data.slug, created.id)
  return created.id
}

async function buildONas(
  payload: Awaited<ReturnType<typeof getPayload>>,
  funderIds: number[],
): Promise<{ excerpt: string; content: PageBlock[] }> {
  const introHtml = mdToHtml(`
V NaZemi jsme dlouho toužili po prostoru, který bychom mohli využívat pro konání našich seminářů, prostoru, kde můžeme hostit další kolektivy a zároveň modelovat a žít naše hodnoty. Podařilo se nám ho najít – ve spolupráci s tišnovským spolkem [Hojnost](https://hojnost.org/) vytváříme místo pro setkávání, odpočinek i práci organizací a týmů. Místo k pobytu a vzdělávání pro školní třídy, kurzy či semináře. Jmenuje se NaNebi a nachází se v prostorách kláštera Porta Coeli v Předklášteří, jen pár vlakových zastávek za Brnem.

NaNebi nabízí **ubytování**, a to včetně potřebného zázemí – větších sálů na společné aktivity, kuchyně a jídelny, zahrady a dalších venkovních prostor. Navíc i s možností **zajištění stravy** po celou dobu pobytu.

Vlastními aktivitami a realizovaným provozem **žijeme nerůst a dobrovolnou skromnost** jako dostupnou alternativu k současnému socioekonomickému systému. O NaNebi nepečujeme sami – součástí pobytů bývá práce zaměřená na oživování kláštera Porta coeli a jeho okolí. Společná práce a péče o lidi a svět kolem nás dává smysl, napojuje na místo, umožňuje zároveň zpomalit, okysličit se po programu a rozjímat. Při naší činnosti se snažíme o maximální lokalizaci zdrojů a proto vaříme z místně dostupných surovin a to výhradně vegansky či vegetariánsky.

Poskytujeme **facilitátorské služby** pro lepší vzájemné porozumění a rozvoj vašich projektů, **vzdělávací programy** i pořádání konferencí.

*bylo by skvělé mít i fotku týmu a nějaké krátké povídání k tomu*
`)

  const supportHtml = mdToHtml(`
## Podpořte naši činnost

NaNebi je naší trhlinou v dominujícím systému. V Předklášteří ukazujeme nerůstovou praxi a vytváříme svobodné, demokratické a udržitelné prostředí založené na potřebách a prospěchu lidí – těch, co místo tvoří, i těch, kteří k nám přijíždějí. Naším cílem je prosperita přijíždějících kolektivů, jejichž přístupy a myšlenky můžeme sdílet, spolurozvíjet a radovat se z nich.

Přejeme si, aby k nám mohly skupiny jezdit bez ohledu na jejich finanční možnosti. Pojďte nám v tom pomoct! Pokud se k nám chystáte, můžete zvážit zaplacení solidární ceny navýšené o 10 až 20 % oproti běžné kalkulaci. Přispět můžete ale i kdykoli jindy, a to zasláním daru přímo na náš transparentní účet 2800235894/2010 nebo přes QR kód:

Výši platby si můžete v dalším kroku změnit. Potvrzení o daru vám rádi vystavíme – stačí napsat email na nanebi@nazemi.cz. Dary použijeme na postupné vylepšování prostor NaNebi a zároveň jako podporu skupin, které nemají z různých důvodů možnost samy cenu za pobyt uhradit.
`)

  const disclaimerHtml = mdToHtml(`
Tento projekt je z části podpořen z veřejné sbírky dobročinných obchodů Nadace Veronica. Projekt je podpořen z projektu GEAR UP! financovaného EU, jehož relizátorem v ČR je České fórum pro rozvojovou spolupráci (FoRS). Za obsah projektu nese výhradní odpovědnost Hojnost, z. s. a nemusí nutně odrážet názory Evropské unie.
`)

  const supportLex = await lex(supportHtml, payload)
  // Logo strip inside Lexical after support copy (BlocksFeature).
  appendNodes(supportLex, [
    lexicalBlock('logoStrip', {
      title: '',
      images: funderIds,
      links: [],
    }),
  ])

  return {
    excerpt:
      'Místo pro setkávání, odpočinek i práci v klášteře Porta Coeli v Předklášteří — ubytování, strava a nerůstová praxe NaNebi.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Prostor pro semináře, kolektivy i vzdělávání v klášteře Porta Coeli — ve spolupráci se spolkem Hojnost.',
      },
      { blockType: 'richText', content: await lex(introHtml, payload) },
      { blockType: 'richText', content: supportLex },
      { blockType: 'richText', content: await lex(disclaimerHtml, payload) },
    ],
  }
}

async function buildStravovani(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<{ excerpt: string; content: PageBlock[] }> {
  const introHtml = mdToHtml(`
Rádi vám zajistíme veganské nebo vegetariánské stravování....protože i u vaření může člověk přemýšlet nad etikou svého konání.

Jsme schopni vyhovět i vašim různým stravovacím omezením a zohlednit ve stravě alergie a nechutenství, pokud nám je včas nahlásíte.

Při vaření se snažíme v co největší míře dbát na sezónnost a lokálnost našich surovin. Ne vždy a u všech surovin je to v dnešním světě možné, ale neustále pátráme po dodavatelích a producentech, kteří nám pomohou na této cestě dojít zase o krok dál.

Skrze spolek Hojnost spolupracujeme s místními producenty zeleniny, ovoce a dalších produktů.

Část zeleniny odebíráme od biozemědělce, který hospodaří na pozemku přímo v areálu kláštera.

Zajímáme se o to, kde a jak se námi používané suroviny vyrábí, řada z našich surovin má proto certifikaci BIO.

Během vašeho pobývání NaNebi si můžete dopřát fairtradový čaj, či kávu z nedalekého sociálního podniku - pražírny v Sejřku.

Záleží nám na tom, abychom produkovali co nejméně odpadu z klášterní kuchyně. Proto odebíráme velké množství surovin bezobalově.

V kuchyni se jen nevaří, ale i uklízí. Proto používáme ekodrogérii, a snažíme se ji odebírat v co největší míře bezobalově.

*fotogalerie*
`)

  const packagesHtml = mdToHtml(`
## Ceník stravování
`)

  const detailHtml = mdToHtml(`
120 Kč – snídaně (kaše + dobroty ke kaši; pečivo + pomazánka; ovoce a zelenina…; káva, čaj)

180 Kč – oběd (polévka + hlavní chod)

150 Kč – večeře (teplá – jedno hlavní lehčí jídlo a salát)

70 Kč – každá svačina (káva, čaj, (ne)mléko, buchta nebo pečivo a pomazánka, ovoce/zelenina)

(Ceny jsou včetně DPH.)

Ceník platí pro skupiny 10 a více lidí. Při menším počtu domlouváme individuálně, zda jsme schopni zajistit stravu a za jakou cenu.

## Počet porcí a storno podmínky

Zajistíme takový počet porcí, který odpovídá počtu lidí nahlášených nejpozději 4 dny předem – fakturujeme pak tento objednaný počet.
`)

  return {
    excerpt:
      'Veganské a vegetariánské stravování ze sezónních a lokálních surovin — včetně alergií na objednávku.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Veganské nebo vegetariánské stravování s důrazem na sezónnost, lokálnost a minimum odpadu.',
      },
      { blockType: 'richText', content: await lex(introHtml, payload) },
      { blockType: 'richText', content: await lex(packagesHtml, payload) },
      {
        blockType: 'threeColumns',
        title: '',
        borders: false,
        columns: [
          {
            body: await lex(
              '<h2>590 Kč den / osoba — všechno</h2><p>Plná penze + káva, čaj, svačina dopoledne i odpoledne.</p>',
              payload,
            ),
          },
          {
            body: await lex(
              '<h2>450 Kč snídaně, oběd, večeře</h2><p>Bez svačin a kávy, čaje v průběhu dne.</p>',
              payload,
            ),
          },
        ],
      },
      { blockType: 'richText', content: await lex(detailHtml, payload) },
    ],
  }
}

async function buildUbytovani(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<{ excerpt: string; content: PageBlock[] }> {
  const introHtml = mdToHtml(`
Zázemí dostupné v NaNebi umožňuje ubytování a realizaci vašeho setkání, ať už se jedná o strategické plánování, vzdělávací seminář, výjezd, workshop, zážitkový program či letní školu.

Máme dva objekty, kde je možné se ubytovat:

Na ***Bauordenu*** je počet ubytovacích kapacit 16 osob ve dvou větších pokojích s vlastním sociálním zařízením (sprchový kout, toaleta, umyvadlo vybavené mýdlem a ručníkem). Pokoje jsou vybaveny základním nábytkem a lampičkami.
`.replace(/\*\*\*/g, '**'))

  const domkyIntroHtml = mdToHtml(`
Na ***Domcích*** nabízíme 12–18 míst na spaní v apartmánech s vlastním vstupem, sociálním zařízením (sprchový kout, toaleta, umyvadlo vybavené mýdlem a ručníkem) a kuchyňským koutem (indukční deska se dvěma plotýnkami, lednice, rychlovarná konvice, základní nádobí). Pokoje jsou vybaveny základním nábytkem a lampičkami.
`.replace(/\*\*\*/g, '**'))

  const domek5Html = mdToHtml(`
- **Domek 5**: apartmán celkem pro 6–8 osob. Cena je 3920 Kč/apartmán/noc. Najdete zde:
  - průchozí kuchyni společnou pro oba pokoje
  - menší pokoj se dvěma jednolůžky 90 x 200 cm a rozkládacím gaučem (po rozložení 140 x 190 cm)
  - větší pokoj se dvěma jednolůžky 90 x 200 cm a jedním dvoulůžkem 160 x 200 cm
  - koupelnu se vstupem z kuchyně
  - vchod z chodby, kde se nachází i úklidová místnost společná pro všechny apartmány, seminární místnost a toaleta

Lze zajistit i další místa na spaní v různých stupních komfortu – pro více informací nás kontaktujte. Pro více informací nás kontaktujte.
`)

  const podminkyHtml = mdToHtml(`
## Podmínky

- **Lůžkoviny** se platí nad rámec uvedené ceny. V pokojích a apartmánech je možné spát na postelích ve vlastních spacácích. Nabízíme i lůžkoviny vč. ručníku za cenu 80 Kč/osoba.
- **Úklid, energie a poplatek z pobytu** jsou součástí ceny.
- V případě obsazení apartmánu pouze jedním člověkem je cena dle domluvy.
- Pokud neobsadíte celou kapacitu objektu, je možné, že bude paralelně s vámi v NaNebi ubytována další skupina.
- V objektech jsou dvě vybavené úklidové místnosti a zamykatelná kolárna.
- Na pokojích a apartmánech je dostupná Wifi.
- K dispozici na zapůjčení je dětská postýlka, jídelní židlička či nepromokavý potah na postel.
- Ve společné úklidové místnosti je k dispozici pračka a sušička (za poplatek), fén a sušák na prádlo.
- Objekt je vytápěn plynovým kotlem s rozvodem do všech pokojů a apartmánů.
- Prostory nenaplňují plně kritéria bezbariérovosti, ale jsou zvětšiny na přízemí bez větších překážek v pohybu. V případě potřeby se nám ozvěte a vyjasníme, jaké jsou možnosti.
- **Doporučený čas** příjezdu a převzetí prostor je mezi 16. a 18. hodinou. Doporučený čas předání prostor před odjezdem je do 10 hodin a následně do 11 hodin opuštění areálu. Pokud chcete přijet dříve či odjet později, lze to v některých případech individuálně domluvit.
- Vzhledem ke stále pokračující tradici živého řeholního společenství ve zdech kláštera naše prostory neslouží k pořádání divokých oslav nebo svateb apod. Prostory nejsou přizpůsobeny pobytům se psy. Prostory jsou nekuřácké.

**Volné termíny** vám rádi sdělíme – kontaktujte nás.

Až najdeme vhodný termín, vyplníte rezervační formulář a zašlete zálohu. Teprve potom budete mít prostor finálně rezervovaný.
`)

  const prostoryIntro = await lex(
    mdToHtml(`
## Prostory na program

Můžeme nabídnout několik prostor pro společný program.
`),
    payload,
  )

  const expands: { summary: string; body: string }[] = [
    {
      summary: 'Seminární místnost',
      body: 'V Domcích je celoročně k dispozici oddělená seminární místnost (se židlemi, stoly lze dodat) pro max. 20 osob. Seminární místnost je k dispozici zdarma při rezervaci ubytování alespoň 4500 Kč/noc, jinak je cena za pronájem 1200 Kč/půlden.',
    },
    {
      summary: 'Štukový sál',
      body: 'V patře Bauordenu je k dispozici sál (se židlemi, bez stolů) pro max. 35 osob. Štukový sál je k dispozici zdarma při rezervaci ubytování alespoň 9000 Kč/noc, jinak je cena za pronájem 2000 Kč/půlden.',
    },
    {
      summary: 'Refektář a Hedvika',
      body: 'Od poloviny května do konce září je možné využívat dva sály v patře Bauordenu – Refektář (až 50 osob, bez stolů) a Hedviku (až 20 osob). Sály jsou nevytápěné, s denním světlem, večer osvětlené pouze několika lampami. Rezervace dle domluvy.',
    },
    {
      summary: 'Jídelna',
      body: 'Na jídlo se využívá jídelna na Bauordenu. Ta není stavebně oddělena od kuchyně, tedy se ve stejném prostoru připravuje jídlo a není vhodné ji využívat na program. Ale v případě, že máte kuchyni rezervovanou pro vlastní vaření, můžete i jídelnu využívat na program.',
    },
    {
      summary: 'Zahrada a venkovní prostory',
      body: 'V teplých měsících je dále možné využívat jednak venkovní prostory (k dispozici je ohniště s lavičkami, několik stanovišť venkovního posezení, můžeme nabídnout velký či menší partystan pro ochranu před deštěm či sluncem…) a dále venkovní jídelnu v podloubí. Využívání je zdarma, zahradu s ohništěm doporučujeme dopředu rezervovat.',
    },
    {
      summary: 'Colibri a obecní sál',
      body: 'Ve spolupráci s místní školou Colibri (3 min od nás, 5500 Kč/den) či obecním úřadem (8 min od nás, 6000 Kč za 1. den, 600 Kč za každý další den, v topných měsících 2000 Kč navíc za pobyt) můžeme zajistit prostory pro až 50-100 osob.',
    },
  ]

  for (const item of expands) {
    appendNodes(prostoryIntro, [
      lexicalBlock('expandingParagraph', {
        summary: item.summary,
        body: await lex(`<p>${esc(item.body)}</p>`, payload),
      }),
    ])
  }

  const afterProstoryHtml = mdToHtml(`
Pro váš program vám rádi zapůjčíme flipchartový stojan, dataprojektor, malý repráček. Fixy, flipy a další facilitátorské pomůcky v rámci samotného pobytu standardně nenabízíme, ale můžete si zde zakoupit flipchartové papíry, fixy na flipchart, papírovou pásku či post-ity.

Pro volný čas nabízíme potřeby na opékání na ohni, gril, venkovní hry jako kubb či mölkky.

**Volné termíny** vám rádi sdělíme – kontaktujte nás.

## Možnosti ceny a stornopodmínky

Budeme rádi, když zvážíte zaplacení ceny za pobyt v solidární výši, která je o 10 % nebo 20 % vyšší a umožňuje nám důstojně pokrýt i takovou práci, kterou v souvislosti s provozem NaNebi a s péčí o klášterní prostory děláme v současnosti dobrovolnicky. Pomůžete také tomu, aby k nám mohly jezdit skupiny bez ohledu na jejich finanční zázemí – tedy i týmy, iniciativy, školy či kolektivy, které si nemohou dovolit zaplatit standardní cenu za pobyt.

Naopak v případě, že by pro vás byla cena vysoká, můžeme se domlouvat na takových podmínkách, které vám umožní akci u nás realizovat. V takovém případě se nám ozvěte na domluvu.

Záloha na váš pobyt činí polovinu z domluvené částky za samotné ubytování a jídlo (tj. bez lůžkovin a dalších služeb). Záloha je vratná při odhlášení 30 dní před nástupem pobytu. Při pozdějším zrušení pobytu či nevyužití části prostor se záloha nevrací (příp. dle individuální domluvy). Jídlo fakturujeme podle počtu osob nahlášených nejpozději čtyři dny před začátkem akce. Lůžkoviny fakturujeme dle reálného stavu na místě.

Podrobné obchodní a storno podmínky NaNebi najdete [zde](https://drive.google.com/file/d/1-ZwIoN46B5YOGeG0P9JvF9uJdo49QB8i/view?usp=sharing).
`)

  return {
    excerpt:
      'Ubytování v Bauordenu a Domcích v Předklášteří — pokoje, apartmány, seminární prostory a zahrada.',
    content: [
      {
        blockType: 'pageIntro',
        headerColor: 'none',
        lead:
          'Ubytování a zázemí pro strategická setkání, semináře, workshopy i letní školy.',
      },
      { blockType: 'richText', content: await lex(introHtml, payload) },
      {
        blockType: 'threeColumns',
        title: 'Bauorden',
        borders: true,
        columns: [
          {
            body: await roomCardBody(payload, {
              name: 'Norbert',
              capacity: '8 osob / noc',
              price: '2900 Kč',
              bodyMd: `Čtyři patrové postele (90 x 200 cm) pro celkem 8 osob, v koupelně jedna toaleta s umyvadlem, dva sprchové kouty a dvě další umyvadla. Cena je 2900 Kč/pokoj/noc.`,
            }),
          },
          {
            body: await roomCardBody(payload, {
              name: 'Václav',
              capacity: '8 osob / noc',
              price: '2900 Kč',
              bodyMd: `Čtyři patrové postele (90 x 200 cm) pro celkem 8 osob, v koupelně jedna toaleta, jeden sprchový kout a dvě umyvadla. Cena je 2900 Kč/pokoj/noc.`,
            }),
          },
        ],
      },
      { blockType: 'richText', content: await lex(domkyIntroHtml, payload) },
      {
        blockType: 'threeColumns',
        title: 'Domky',
        borders: true,
        columns: [
          {
            body: await roomCardBody(payload, {
              name: 'Domek 1',
              capacity: '2–4 osoby',
              price: '1840 Kč/noc',
              bodyMd: `
- průchozí kuchyni s rozkládacím gaučem (po rozložení 140 x 190 cm)
- pokoj se dvěma jednolůžky 90 x 200 cm (lze spojit do dvoulůžka)
- koupelnu se vstupem z pokoje
`,
            }),
          },
          {
            body: await roomCardBody(payload, {
              name: 'Domek 2',
              capacity: '2 osoby',
              price: '1840 Kč/noc',
              bodyMd: `
- průchozí kuchyni s vybavením (mimo výše uvedeného navíc indukční deska se 4 plotýnkami, trouba, toustovač, mixér)
- pokoj s jedním dvoulůžkem 160 x 200 cm
- koupelnu se vstupem z chodby
`,
            }),
          },
          {
            body: await roomCardBody(payload, {
              name: 'Domek 3',
              capacity: '2–4 osoby',
              price: '1840 Kč/noc',
              bodyMd: `
- průchozí kuchyni
- pokoj se dvěma jednolůžky 90 x 200 cm (lze spojit do dvoulůžka) a rozkládacím gaučem (po rozložení 140 x 190 cm)
- koupelnu se vstupem z kuchyně
`,
            }),
          },
        ],
      },
      { blockType: 'richText', content: await lex(domek5Html, payload) },
      { blockType: 'richText', content: await lex(podminkyHtml, payload) },
      { blockType: 'richText', content: prostoryIntro },
      { blockType: 'richText', content: await lex(afterProstoryHtml, payload) },
    ],
  }
}

async function main() {
  // Touch sources so they stay next to the script (human-editable).
  for (const name of ['O-nas.md', 'Stravovani.md', 'Ubytovani.md']) {
    readFileSync(join(DATA, name), 'utf8')
  }

  const payload = await getPayload({ config })
  const siteRes = await payload.find({
    collection: 'sites',
    where: { slug: { equals: 'nanebi' } },
    limit: 1,
  })
  const siteId = siteRes.docs[0]?.id
  if (typeof siteId !== 'number') throw new Error('NaNebi site not found')

  const funderIds = await ensureFunderMedia(payload)
  console.log('funder media', funderIds)

  const oNas = await buildONas(payload, funderIds)
  await upsertPage(payload, siteId, {
    slug: 'o-nas',
    title: 'O nás',
    excerpt: oNas.excerpt,
    content: oNas.content,
  })

  const strava = await buildStravovani(payload)
  await upsertPage(payload, siteId, {
    slug: 'stravovani',
    title: 'Stravování',
    excerpt: strava.excerpt,
    content: strava.content,
  })

  const ubyt = await buildUbytovani(payload)
  await upsertPage(payload, siteId, {
    slug: 'ubytovani',
    title: 'Ubytování',
    excerpt: ubyt.excerpt,
    content: ubyt.content,
  })

  console.log('done')
  console.log('  http://localhost:3000/o-nas?site=nanebi')
  console.log('  http://localhost:3000/ubytovani?site=nanebi')
  console.log('  http://localhost:3000/stravovani?site=nanebi')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
