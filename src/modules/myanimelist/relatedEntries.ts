// The source relation on a MAL anime page.
//
// MAL states the source twice and the two disagree in a way that matters. The
// sidebar says what kind of thing was adapted -- "Manga", "Light novel" -- and
// the Related Entries section lists the actual entries, which for a light novel
// series routinely includes both:
//
//   source: "Light novel"
//     Adaptation (Manga)        -> /manga/3299
//     Adaptation (Light Novel)  -> /manga/9115
//
// That is Spice & Wolf. The anime adapts the light novel; the manga is itself
// an adaptation of the same novel. Taking the first Adaptation entry picks the
// manga and records a relation that is simply wrong -- and wrong here is worse
// than absent, because relating adaptations to each other is the entire point.
//
// So the sidebar's Source is used to choose between them.

export interface AdaptationEntry {
  readonly relation: string
  readonly kind: string
  readonly href: string
  readonly title: string
}

// Runs in the page.
export function readAdaptations(): AdaptationEntry[] {
  const norm = (s: string | null | undefined): string =>
    (s || '').replace(/\s+/g, ' ').trim()

  const found: AdaptationEntry[] = []

  const push = (relation: string, href: string | null, title: string): void => {
    if (!href || !/\/manga\/\d+/.test(href)) {
      return
    }
    // "Adaptation (Light Novel)" -> kind "Light Novel"
    const match: RegExpMatchArray | null = relation.match(/\(([^)]+)\)/)
    found.push({
      relation,
      kind: match ? match[1] : '',
      href,
      title,
    })
  }

  // The tile layout, which is what MAL serves today.
  document.querySelectorAll('.related-entries .entry').forEach((entry: Element) => {
    const anchor: HTMLAnchorElement | null = entry.querySelector('.title a')
    // Some .entry nodes carry no link at all; skipping them is not an error.
    if (!anchor) {
      return
    }
    push(
      norm(entry.querySelector('.relation')?.textContent),
      anchor.getAttribute('href'),
      norm(anchor.textContent),
    )
  })

  // The table layout, which still appears inside .related-entries for some
  // relation kinds and standalone on older entries.
  document
    .querySelectorAll('.related-entries table tr, table.anime_detail_related_anime tr')
    .forEach((row: Element) => {
      const label: string = norm(
        row.querySelector('td.ar, td:first-child')?.textContent,
      ).replace(/:$/, '')
      row.querySelectorAll('td a').forEach((anchor: Element) => {
        push(label, anchor.getAttribute('href'), norm(anchor.textContent))
      })
    })

  return found
}

// MAL's Source wording against the parenthetical on a related entry. They are
// not spelled identically -- "Light novel" against "(Light Novel)" -- so both
// sides are folded before comparing.
function fold(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Picks the entry the anime is actually adapted from.
 *
 * Returns null rather than guessing when the page is ambiguous: several
 * adaptations and no Source to choose between them. A null source_work_id is
 * the honest answer and the next scrape can revisit it; a wrong one silently
 * relates two unrelated series.
 */
export function pickSourceAdaptation(
  entries: readonly AdaptationEntry[],
  source: string | null,
): AdaptationEntry | null {
  const adaptations: AdaptationEntry[] = entries.filter((entry: AdaptationEntry) =>
    /adaptation/i.test(entry.relation),
  )

  // MAL lists the same entry in both layouts, so the same href arrives twice.
  const seen: Set<string> = new Set()
  const unique: AdaptationEntry[] = adaptations.filter((entry: AdaptationEntry) => {
    if (seen.has(entry.href)) {
      return false
    }
    seen.add(entry.href)

    return true
  })

  if (unique.length === 0) {
    return null
  }

  if (source) {
    const matched: AdaptationEntry = unique.find(
      (entry: AdaptationEntry) => entry.kind && fold(entry.kind) === fold(source),
    )
    if (matched) {
      return matched
    }
  }

  // One candidate and nothing to contradict it.
  return unique.length === 1 ? unique[0] : null
}
