/** Explicit Czech (and common Latin) folds — NFD miss or odd code points still map. */
const CHAR_FOLD: Record<string, string> = {
  á: 'a',
  à: 'a',
  ä: 'a',
  â: 'a',
  ã: 'a',
  å: 'a',
  ā: 'a',
  ă: 'a',
  ą: 'a',
  č: 'c',
  ć: 'c',
  ç: 'c',
  ď: 'd',
  đ: 'd',
  é: 'e',
  è: 'e',
  ě: 'e',
  ë: 'e',
  ê: 'e',
  ē: 'e',
  ę: 'e',
  í: 'i',
  ì: 'i',
  ï: 'i',
  î: 'i',
  ī: 'i',
  ł: 'l',
  ľ: 'l',
  ĺ: 'l',
  ň: 'n',
  ñ: 'n',
  ń: 'n',
  ó: 'o',
  ò: 'o',
  ö: 'o',
  ô: 'o',
  õ: 'o',
  ø: 'o',
  ō: 'o',
  ř: 'r',
 ŕ: 'r',
  š: 's',
  ś: 's',
  ş: 's',
  ș: 's',
  ť: 't',
  ţ: 't',
  ț: 't',
  ú: 'u',
  ù: 'u',
  ů: 'u',
  ü: 'u',
  û: 'u',
  ū: 'u',
  ý: 'y',
  ÿ: 'y',
  ž: 'z',
  ź: 'z',
  ż: 'z',
}

function foldChar(char: string): string {
  const lower = char.toLocaleLowerCase('cs')
  if (CHAR_FOLD[lower]) return CHAR_FOLD[lower]
  const nfd = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (nfd !== lower) return nfd
  return CHAR_FOLD[nfd] ?? nfd
}

/** Strip / map diacritics (Czech-first) for search matching. */
export function foldDiacritics(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; ) {
    const codePoint = value.codePointAt(i)
    if (codePoint == null) break
    const char = String.fromCodePoint(codePoint)
    out += foldChar(char)
    i += codePoint > 0xffff ? 2 : 1
  }
  return out.toLocaleLowerCase('cs')
}

/**
 * Fold text while mapping each folded index back to the original string index.
 * Used so highlights can match “klima” against “Klima” / “ů” against “u”.
 */
export function foldDiacriticsWithMap(value: string): { folded: string; indexMap: number[] } {
  const indexMap: number[] = []
  let folded = ''

  for (let i = 0; i < value.length; ) {
    const codePoint = value.codePointAt(i)
    if (codePoint == null) break
    const char = String.fromCodePoint(codePoint)
    const next = i + (codePoint > 0xffff ? 2 : 1)
    const foldedChar = foldDiacritics(char)
    for (let j = 0; j < foldedChar.length; j += 1) {
      folded += foldedChar[j]
      indexMap.push(i)
    }
    i = next
  }

  return { folded, indexMap }
}
