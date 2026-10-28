'use client'

import { useEffect } from 'react'

/**
 * Stock EXPERIMENTAL table UI is English-only.
 * Translate visible chrome in-place (admin Lexical only).
 *
 * Action-menu labels often split across sibling text nodes
 * ("Insert " + "row" + " above") — translate whole `.text` / `.item` textContent.
 */
const EXACT: Record<string, string> = {
  'Add Column': 'Přidat sloupec',
  'Add Row': 'Přidat řádek',
  'Create Table': 'Tabulka',
  'Delete column': 'Smazat sloupec',
  'Delete row': 'Smazat řádek',
  'Delete table': 'Smazat tabulku',
  'Merge cells': 'Sloučit buňky',
  Table: 'Tabulka',
  'Toggle First Column Freeze': 'Zmrazit první sloupec',
  'Toggle Row Striping': 'Proužkování řádků',
  'Unmerge cells': 'Rozdělit buňky',
}

function czechCount(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

function translateLabel(text: string): null | string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null

  const exact = EXACT[trimmed]
  if (exact) return exact

  let m = /^Insert (?:(\d+) )?rows? (above|below)$/i.exec(trimmed)
  if (m) {
    const n = m[1] ? Number(m[1]) : 1
    const where = m[2].toLowerCase() === 'above' ? 'nad' : 'pod'
    return `Vložit ${czechCount(n, 'řádek', 'řádky', 'řádků')} ${where}`
  }

  m = /^Insert (?:(\d+) )?columns? (left|right)$/i.exec(trimmed)
  if (m) {
    const n = m[1] ? Number(m[1]) : 1
    const where = m[2].toLowerCase() === 'left' ? 'vlevo' : 'vpravo'
    return `Vložit ${czechCount(n, 'sloupec', 'sloupce', 'sloupců')} ${where}`
  }

  m = /^(Add|Remove) row header$/i.exec(trimmed)
  if (m) {
    return m[1].toLowerCase() === 'add' ? 'Přidat záhlaví řádku' : 'Odebrat záhlaví řádku'
  }

  m = /^(Add|Remove) column header$/i.exec(trimmed)
  if (m) {
    return m[1].toLowerCase() === 'add' ? 'Přidat záhlaví sloupce' : 'Odebrat záhlaví sloupce'
  }

  return null
}

function setElementText(el: Element, next: string) {
  // Collapse split React text children into one translated string.
  while (el.firstChild) el.removeChild(el.firstChild)
  el.appendChild(document.createTextNode(next))
}

function translateElement(el: Element) {
  const current = el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  if (!current) return
  // Already Czech — skip (avoid thrashing MutationObserver).
  if (!/^(Insert |Add |Remove |Delete |Merge |Unmerge |Toggle |Create |Table$)/i.test(current)) {
    return
  }
  const next = translateLabel(current)
  if (next && next !== current) setElementText(el, next)
}

function translateAria(root: ParentNode = document) {
  root.querySelectorAll?.('[aria-label]').forEach((el) => {
    const label = el.getAttribute('aria-label')
    if (!label) return
    const next = translateLabel(label)
    if (next && next !== label) el.setAttribute('aria-label', next)
  })
}

function translateTableUi() {
  // Prefer `.text` spans (keeps button chrome). Fallback: `.item` with no `.text`.
  document.querySelectorAll('.table-action-menu-dropdown .text').forEach((el) => {
    translateElement(el)
  })
  document.querySelectorAll('.table-action-menu-dropdown .item').forEach((el) => {
    if (el.querySelector('.text')) return
    translateElement(el)
  })

  // Toolbar / slash / drawer titles (single text node usually, but same path is fine).
  document
    .querySelectorAll(
      '.fixed-toolbar .toolbar-popup__dropdown-item, .slash-menu-popup .slash-menu-popup__item-label, [class*="drawer"] .drawer__header, [class*="drawer"] h1, [class*="drawer"] h2',
    )
    .forEach((el) => translateElement(el))

  // Fallback walk for plain "Table" / "Create Table" text nodes in scoped chrome.
  document
    .querySelectorAll(
      '.fixed-toolbar, .inline-toolbar, .slash-menu-popup, [class*="drawer"]',
    )
    .forEach((root) => {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node = walk.nextNode()
      while (node) {
        const raw = node.nodeValue
        if (raw) {
          const trimmed = raw.trim()
          if (trimmed === 'Table' || trimmed === 'Create Table') {
            const next = EXACT[trimmed]
            if (next) {
              const lead = raw.match(/^\s*/)?.[0] ?? ''
              const trail = raw.match(/\s*$/)?.[0] ?? ''
              node.nodeValue = `${lead}${next}${trail}`
            }
          }
        }
        node = walk.nextNode()
      }
    })

  translateAria(document)
}

/** Lexical plugin: Czech-ify stock table chrome. */
export function NazemiTableUiCsPlugin() {
  useEffect(() => {
    translateTableUi()
    const obs = new MutationObserver(translateTableUi)
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    return () => obs.disconnect()
  }, [])

  return null
}
