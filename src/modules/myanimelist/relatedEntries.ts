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
  // Which side of MAL the entry points at. The same Related Entries block
  // appears on both anime and manga pages and links to both kinds, so callers
  // have to say which they want rather than assuming the page decides.
  readonly recordType: 'anime' | 'manga'
}

// Runs in the page.
export function readAdaptations(): AdaptationEntry[] {
  const norm = (s: string | null | undefined): string =>
    (s || '').replace(/\s+/g, ' ').trim()

  const found: AdaptationEntry[] = []

  const push = (relation: string, href: string | null, title: string): void => {
    if (!href) {
      return
    }
    const isManga: boolean = /\/manga\/\d+/.test(href)
    const isAnime: boolean = /\/anime\/\d+/.test(href)
    if (!isManga && !isAnime) {
      return
    }
    // "Adaptation (Light Novel)" -> kind "Light Novel". On a manga page the
    // parenthetical is the anime's media type instead -- "(TV)", "(OVA)" -- so
    // kind only means "what was adapted" for manga entries.
    const match: RegExpMatchArray | null = relation.match(/\(([^)]+)\)/)
    found.push({
      relation,
      kind: match ? match[1] : '',
      href,
      title,
      recordType: isManga ? 'manga' : 'anime',
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
  // Manga entries only. readAdaptations now returns both kinds, and this
  // function answers "what was this anime adapted from" -- an anime entry is
  // never an answer to that.
  const adaptations: AdaptationEntry[] = entries.filter(
    (entry: AdaptationEntry) =>
      entry.recordType === 'manga' && /adaptation/i.test(entry.relation),
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

/**
 * Every anime the manga page relates to by adaptation.
 *
 * The reverse of pickSourceAdaptation, and deliberately not a "pick": a work
 * can be adapted many times and all of them are real -- Hellsing lists both the
 * 2001 TV series and Ultimate. Returning all of them is the point, since
 * relating re-adaptations to each other is why works are modelled at all.
 *
 * Unlike the anime side this cannot decide on its own whether a relation is
 * true. MAL's "Adaptation" is symmetric and says only that two entries are
 * related by an adaptation somewhere in the chain, not that this anime adapts
 * this work. The Spice & Wolf manga page lists five anime that all adapt the
 * light novel it was itself adapted from. So these are candidates, and
 * sourceMatchesWorkType is what turns a candidate into a link.
 */
export function pickAnimeAdaptations(
  entries: readonly AdaptationEntry[],
): AdaptationEntry[] {
  const adaptations: AdaptationEntry[] = entries.filter(
    (entry: AdaptationEntry) =>
      entry.recordType === 'anime' && /adaptation/i.test(entry.relation),
  )

  // MAL lists the same entry in both layouts, so the same href arrives twice.
  const seen: Set<string> = new Set()

  return adaptations.filter((entry: AdaptationEntry) => {
    if (seen.has(entry.href)) {
      return false
    }
    seen.add(entry.href)

    return true
  })
}

/**
 * Folds MAL's many spellings into the family of source they describe.
 *
 * MAL writes the same idea differently on either side: a manga page's Type says
 * "Manga" or "Light Novel", while an anime's Source says "Manga", "Web manga",
 * "4-koma manga", "Light novel". Comparing the raw strings links almost
 * nothing.
 *
 * The order of these tests matters. "Light novel" and "Web novel" both contain
 * "novel", so they have to be recognised before the plain novel case or every
 * light novel would fold to `novel` and match the wrong works -- which is
 * exactly the Spice & Wolf confusion this whole guard exists to prevent.
 */
function family(value: string): string {
  const folded: string = fold(value)

  if (folded.includes('lightnovel')) {
    return 'lightnovel'
  }
  if (folded.includes('webnovel')) {
    return 'webnovel'
  }
  if (folded.includes('visualnovel')) {
    return 'visualnovel'
  }
  if (folded.includes('novel') || folded === 'book') {
    return 'novel'
  }
  // Manhwa, manhua and OEL have no matching MAL source value -- an anime drawn
  // from any of them reports "Manga" -- so they fold together with it. One-shots
  // and doujinshi are the same story.
  if (
    folded.includes('manga') ||
    folded === 'manhwa' ||
    folded === 'manhua' ||
    folded === 'oel' ||
    folded === 'oneshot' ||
    folded === 'doujinshi'
  ) {
    return 'manga'
  }

  return folded
}

/**
 * Whether an anime's recorded Source is consistent with this work's Type.
 *
 * The guard on linking from the manga side. An anime whose Source is "Light
 * novel" is not adapted from a manga, however prominently the manga page lists
 * it, so a mismatch means no link rather than a guess.
 *
 * Returns false when either side is missing. An anime with no Source recorded
 * cannot be checked, and an unverified link is worse than an absent one: a null
 * source_work_id is fixed by the next scrape, a wrong one silently relates two
 * unrelated series and nothing ever revisits it.
 */
export function sourceMatchesWorkType(
  animeSource: string | null | undefined,
  workType: string | null | undefined,
): boolean {
  if (!animeSource || !workType) {
    return false
  }

  return family(animeSource) === family(workType)
}
