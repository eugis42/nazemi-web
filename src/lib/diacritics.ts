/** Strip combining marks (Czech diacritics) for search matching. */
export function foldDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('cs')
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
