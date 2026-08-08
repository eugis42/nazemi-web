import { CALENDAR_FILTERS, type CalendarEventSeed } from './data/events'
import { TOPIC_FILTER_IDS as PUBLICATION_TOPIC_FILTER_IDS } from './data/publications'
import { TOPIC_FILTER_IDS as WORKSHOP_TOPIC_FILTER_IDS } from './data/workshops'
import { type NewsArticleSeed } from './data/news'
import { slugifyCs } from './utils'

/** Design filter ids double as taxonomy slugs where they exist. */
const FILTER_SLUG_BY_LABEL = new Map<string, string>([
  ...CALENDAR_FILTERS.filter((filter) => !('kind' in filter)).map(
    (filter) => [filter.label, filter.id] as [string, string],
  ),
  ...Object.entries(PUBLICATION_TOPIC_FILTER_IDS),
  ...Object.entries(WORKSHOP_TOPIC_FILTER_IDS),
])

export const tagSlug = (label: string) => FILTER_SLUG_BY_LABEL.get(label) ?? slugifyCs(label)

/**
 * Which workshop a calendar event is a scheduled run of. Derived from the design
 * event titles / filters — events without an obvious match stay standalone.
 */
export const EVENT_WORKSHOP_SLUGS: Record<string, string> = {
  'nenasilna-komunikace-pro-ucitele': 'nenasilna-komunikace',
  'nenasilna-komunikace-pokrocily': 'nenasilna-komunikace',
  'nenasilna-komunikace-v-tymu': 'nenasilna-komunikace',
  'nerustova-akademie-2026': 'nerust-pro-zacatecniky',
  'nerustova-akademie-podzim': 'nerust-pro-zacatecniky',
  'nerustova-akademie-2025': 'nerust-pro-zacatecniky',
  'nerust-a-vzdelavani': 'nerust-pro-zacatecniky',
  'workshop-svoboda-ktera-funguje': 'seberizeni-organizaci',
  'budoucnost-prace-bez-hierarchie': 'seberizeni-organizaci',
  'facilitace-v-praxi': 'facilitace-v-tymu',
  'workshop-facilitace-zacatecnici': 'facilitace-v-tymu',
  'rocni-setkani-flow-makers': 'facilitace-v-tymu',
  'dekolonizovat-diskuse': 'globalni-vzdelavani',
  'nebudeme-mlcet-protest': 'obcanska-odolnost',
  'protest-klimaticka-spravedlnost': 'obcanska-odolnost',
  'protest-ochrana-zelene': 'obcanska-odolnost',
}

export const eventExcerpt = (event: CalendarEventSeed) =>
  `${event.date}${event.time ? `, ${event.time}` : ''} — ${event.location}. ${event.tags.join(', ')}.`

/** Lexical-safe design EventProse demo (image injected as upload node in seed). */
export const designDemoProseHtml = () => `
<h2>Co vás na akademii čeká</h2>
<h3>Program a formát setkání</h3>
<p>
  Reprehenderit proident sunt velit reprehenderit dolore enim cupidatat irure sit consectetur ut voluptate non eu.
  Ad laborum dolore elit laborum ipsum id elit proident laborum sit aute officia sunt. Do Lorem occaecat amet.
  Irure elit id ad mollit fugiat exercitation dolore anim.
</p>
<p>
  Ex laborum aliqua id labore non laboris Lorem amet in sint Lorem. Veniam ea exercitation sit et ea ut sit ut sit aute et.
  Culpa veniam non proident. Veniam minim anim consectetur magna duis.
</p>

<h3>Pro koho je akce určená</h3>
<ul>
  <li>Pedagogové a pedagožky hledající praktické nástroje pro třídu</li>
  <li>Facilitátoři komunitních setkání a diskusí</li>
  <li>Studenti transformativního vzdělávání</li>
  <li>Každý, kdo chce propojit teorii nerůstu s každodenní praxí</li>
</ul>

<blockquote>
  <p>
    Excepteur dolore duis pariatur cillum quis proident. Do id et amet. Nulla deserunt do officia incididunt excepteur
    sit exercitation. Fugiat veniam adipisicing sunt minim sit est nostrud sint cupidatat ex minim.
  </p>
</blockquote>

<p>
  Exercitation dolor anim aute anim officia laboris veniam pariatur sunt anim aliquip laboris occaecat commodo.
  Qui sunt mollit reprehenderit reprehenderit aute eu irure veniam consequat fugiat qui reprehenderit aute reprehenderit occaecat.
</p>

<!--DEMO_PROSE_IMAGE-->

<p><em>Fotografie z předchozího ročníku Nerůstové akademie v NaNebi.</em></p>

<h3>Harmonogram dne</h3>
<ol>
  <li><strong>14:00</strong> — Registrace a uvítání</li>
  <li><strong>14:30</strong> — Úvod do nerůstových konceptů</li>
  <li><strong>16:00</strong> — Pracovní skupiny a sdílení</li>
  <li><strong>18:00</strong> — Večeře a neformální networking</li>
  <li><strong>19:30</strong> — Panelová diskuse a závěr</li>
</ol>

<h3>Co si přinést</h3>
<ul>
  <li>Poznámkový blok nebo sešit</li>
  <li>Otevřenost k dialogu napříč názory</li>
  <li>Pohodlné oblečení na celodenní program</li>
</ul>

<h3>Podrobnosti k registraci</h3>
<p><strong>Kapacita</strong></p>
<p>Maximálně 40 účastníků — po naplnění kapacity uzavíráme registraci.</p>
<p><strong>Cena</strong></p>
<p>Účast je na bázi dobrovolného příspěvku; doporučená částka je 500 Kč.</p>
<p><strong>Storno</strong></p>
<p>Registraci lze zrušit nejpozději 48 hodin před začátkem akce.</p>

<h3>Program v bodech</h3>
<ul>
  <li>Úvod a seznámení — check-in a káva, krátké představení komunity NaZemi</li>
  <li>Hlavní blok — teoretický úvod a praktické cvičení ve dvojicích</li>
  <li>Závěrečné sdílení</li>
</ul>

<p>
  Více informací najdete v <a href="https://nazemi.cz">archivu NaZemi</a> nebo nám napište na
  <a href="mailto:info@nazemi.cz">info@nazemi.cz</a>.
</p>

<hr />

<p><em>Počet míst je omezený — registrace probíhá do naplnění kapacity.</em></p>
`

/** The design uses one shared demo body for all events without custom HTML. */
export const eventBodyHtml = (_event: CalendarEventSeed) => designDemoProseHtml()

export const newsExcerpt = (article: NewsArticleSeed) =>
  `${article.title} — ${article.tags.join(', ')}. Text ${article.author}${
    article.source ? `, ${article.source}` : ''
  }.`

/** Design news items carry no body; compose a short editorial body from the metadata. */
export const newsBodyHtml = (article: NewsArticleSeed) => `<p>${article.title}</p>
<p>Text vznikl v redakci NaZemi${article.source ? ` ve spolupráci s ${article.source}` : ''} a shrnuje, co se u nás k tématu ${article.tags
  .join(', ')
  .toLowerCase()} děje. Sledujte také náš kalendář — na většinu témat navazují workshopy a otevřená setkání.</p>

<h2>Proč to řešíme</h2>
<p>Věříme, že potřeby všech se dají naplnit v rámci planetárních mezí. K tomu ale potřebujeme hlubokou a systémovou transformaci — ve školách, v organizacích i v ekonomice.</p>

<h3>Kde se dozvíte víc</h3>
<ul>
  <li>V <a href="/kalendar">kalendáři</a> najdete nejbližší akce k tématu</li>
  <li>V <a href="/publikace">knihovně</a> jsou publikace a metodiky ke stažení i k zapůjčení</li>
  <li>Newsletter posíláme několikrát ročně — bez spamu</li>
</ul>

<p>Autor textu: ${article.author}.</p>`

/** Publication detail body when the design has no custom `bodyHtml`. */
export const publicationFallbackBodyHtml = (description: string) => `<h2>O publikaci</h2>
<p>${description}</p>
<p>Podrobnější informace o obsahu, autorech a doporučeném využití publikace doplníme v knihovně NaZemi.</p>`

export const projectBodyHtml = (title: string, description: string) => `<h2>${title}</h2>
<p>${description}</p>
<p>Projekt je součástí práce NaZemi na proměně ekonomiky, vzdělávání a fungování organizací. Aktuality k projektu najdete v <a href="/aktuality">přehledu aktualit</a>.</p>`

/** Generic pages without custom body use the same design EventProse demo. */
export const genericPageBodyHtml = (_title: string, _description: string) => designDemoProseHtml()
