import { WORK_TYPE } from '../work/repository/interface'

// MAL's sidebar, read as structure rather than as text.
//
// Each row is a label in a <span> followed by its value, and where the value is
// a set of things -- authors, genres, themes -- each one is its own <a>. Reading
// the anchors is the difference between a correct list and the bug that already
// lives in anime.studios: splitting the row's text on commas turns
// "Sunrise, Inc." into ["Sunrise", " Inc."], and MAL writes authors as
// "Yukimura, Makoto (Story & Art)" -- surname first, comma inside the name.
// Every author would split in half.
export interface SidebarRow {
  readonly label: string
  readonly text: string
  readonly links: string[]
}

// Runs in the page. Returns one entry per sidebar row.
export function readSidebar(): SidebarRow[] {
  const rows = Array.from(document.querySelectorAll('#content td .spaceit_pad'))

  return rows.map((row: Element) => {
    const span: Element | null = row.querySelector('span')
    const label: string = (span?.textContent || '')
      .replace(/:/g, '')
      .trim()
      .toLowerCase()

    const anchors: Element[] = Array.from(row.querySelectorAll('a'))

    return {
      label,
      text: (row.textContent || '').replace(span?.textContent || '', '').trim(),
      links: anchors.map((a: Element) => (a.textContent || '').trim()),
    }
  })
}

export function rowText(rows: SidebarRow[], label: string): string | null {
  const row: SidebarRow = rows.find((r: SidebarRow) => r.label === label)

  return row && row.text ? row.text : null
}

// Prefer the anchors; fall back to the raw text only when the row has none,
// which is how MAL renders a single unlinked value.
export function rowList(rows: SidebarRow[], label: string): string[] {
  const row: SidebarRow = rows.find((r: SidebarRow) => r.label === label)
  if (!row) {
    return []
  }
  if (row.links.length > 0) {
    return row.links
  }

  return row.text ? [row.text] : []
}

// "1,234,567" -> 1234567, "Unknown" -> null.
export function malNumber(value: string | null): number | null {
  if (!value) {
    return null
  }
  const digits: string = value.replace(/[^0-9.]/g, '')
  if (!digits) {
    return null
  }
  const parsed: number = Number(digits)

  return Number.isFinite(parsed) ? parsed : null
}

// MAL's Type on a /manga/ page. The values are the manga family; anything
// unrecognised is stored as MANGA rather than dropped, because a new label is
// far more likely than a genuinely new shape and losing the row helps nobody.
const TYPES: ReadonlyMap<string, WORK_TYPE> = new Map([
  ['manga', WORK_TYPE.Manga],
  ['light novel', WORK_TYPE.LightNovel],
  ['novel', WORK_TYPE.Novel],
  ['web manga', WORK_TYPE.WebManga],
  ['web novel', WORK_TYPE.WebNovel],
  ['one-shot', WORK_TYPE.OneShot],
  ['oneshot', WORK_TYPE.OneShot],
  ['doujinshi', WORK_TYPE.Doujinshi],
  ['manhwa', WORK_TYPE.Manhwa],
  ['manhua', WORK_TYPE.Manhua],
  ['4-koma manga', WORK_TYPE.FourKoma],
  ['4-koma', WORK_TYPE.FourKoma],
])

export function toWorkType(value: string | null): WORK_TYPE {
  return TYPES.get((value || '').trim().toLowerCase()) || WORK_TYPE.Manga
}

// /manga/<id>/<slug> -> <id>
export function malIdFromUrl(url: string): number | null {
  const match: RegExpMatchArray | null = url.match(/\/manga\/(\d+)/)

  return match ? parseInt(match[1], 10) : null
}

// MAL writes Published as "Aug 13, 2005 to Jul 8, 2021", and for anything still
// running as "Aug 13, 2005 to ?". Precision varies: a year alone, or a month and
// year, are both common on older entries.
//
// An unparseable half yields null rather than an approximate date. A wrong
// publication date is worse than a missing one -- it is the field that decides
// which adaptation came first.
export function parsePublished(
  value: string | null,
  parseDate: (s: string, f: string, ref: Date) => Date,
  isValidDate: (d: Date) => boolean,
): { from: Date | null; to: Date | null } {
  if (!value || value.trim().toLowerCase() === 'not available') {
    return { from: null, to: null }
  }

  // MAL pads the day: "Dec  22, 1995 to May  10, 2005", two spaces after the
  // month. date-fns matches the literal separator in the format string, so
  // 'LLL d, yyyy' fails on it and every publication date comes back null --
  // which is the field that decides which adaptation came first.
  const [rawFrom, rawTo] = value.replace(/\s+/g, ' ').split(' to ')

  const one = (part: string | undefined): Date | null => {
    const text: string = (part || '').trim()
    if (!text || text === '?') {
      return null
    }

    for (const format of ['LLL d, yyyy', 'LLL yyyy', 'yyyy']) {
      const parsed: Date = parseDate(text, format, new Date())
      if (isValidDate(parsed)) {
        return parsed
      }
    }

    return null
  }

  return { from: one(rawFrom), to: one(rawTo) }
}
