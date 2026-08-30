import {
  AdaptationEntry,
  pickAnimeAdaptations,
  pickSourceAdaptation,
  sourceMatchesWorkType,
} from './relatedEntries'

/*
  These fixtures are the two shapes that decide whether linking from the manga
  side is correct, taken from the real pages:

    Hellsing        /manga/267   -- an original manga, adapted twice
    Spice & Wolf    /manga/3299  -- a manga that is itself an adaptation of a
                                    light novel, and lists that novel's anime

  Both list anime under "Adaptation". Only Hellsing's are adaptations *of it*.
*/

const entry = (
  relation: string,
  href: string,
  title: string,
  recordType: 'anime' | 'manga',
): AdaptationEntry => ({
  relation,
  kind: (relation.match(/\(([^)]+)\)/) || ['', ''])[1],
  href,
  title,
  recordType,
})

const HELLSING: AdaptationEntry[] = [
  entry('Prequel (Manga)', 'https://myanimelist.net/manga/751/Hellsing__The_Dawn', 'Hellsing: The Dawn', 'manga'),
  entry('Adaptation (TV)', 'https://myanimelist.net/anime/270/Hellsing', 'Hellsing', 'anime'),
  entry('Adaptation (OVA)', 'https://myanimelist.net/anime/777/Hellsing_Ultimate', 'Hellsing Ultimate', 'anime'),
]

const SPICE_AND_WOLF_MANGA: AdaptationEntry[] = [
  entry('Adaptation (Light Novel)', 'https://myanimelist.net/manga/9115/Ookami_to_Koushinryou', 'Ookami to Koushinryou', 'manga'),
  entry('Adaptation (TV)', 'https://myanimelist.net/anime/2966/Ookami_to_Koushinryou', 'Ookami to Koushinryou', 'anime'),
  entry('Adaptation (OVA)', 'https://myanimelist.net/anime/5341/Ookami_to_Koushinryou_II', 'Ookami to Koushinryou II', 'anime'),
  entry('Adaptation (TV)', 'https://myanimelist.net/anime/51122/Ookami_to_Koushinryou__Merchant_Meets', 'Merchant Meets the Wise Wolf', 'anime'),
]

describe('pickAnimeAdaptations', () => {
  it('returns every anime adapted from the work, not just the first', () => {
    const picked = pickAnimeAdaptations(HELLSING)

    // Both adaptations are real and relating them to each other is the point of
    // modelling works -- returning one would defeat it.
    expect(picked.map((e) => e.href)).toEqual([
      'https://myanimelist.net/anime/270/Hellsing',
      'https://myanimelist.net/anime/777/Hellsing_Ultimate',
    ])
  })

  it('ignores manga entries, including the prequel', () => {
    const picked = pickAnimeAdaptations(HELLSING)

    expect(picked.every((e) => e.recordType === 'anime')).toBe(true)
  })

  it('de-duplicates the entry MAL renders in both layouts', () => {
    const doubled = [...HELLSING, ...HELLSING]

    expect(pickAnimeAdaptations(doubled)).toHaveLength(2)
  })

  it('returns candidates it cannot vouch for, leaving the guard to decide', () => {
    // All four of these adapt the light novel, not this manga. The function
    // still returns them: it has no way to tell from the page alone, which is
    // exactly why callers must apply sourceMatchesWorkType.
    expect(pickAnimeAdaptations(SPICE_AND_WOLF_MANGA)).toHaveLength(3)
  })
})

describe('sourceMatchesWorkType', () => {
  it('links an anime adapted from a manga to a manga', () => {
    expect(sourceMatchesWorkType('Manga', 'Manga')).toBe(true)
  })

  it('refuses to link a light novel anime to the manga of the same series', () => {
    // The Spice & Wolf case. Getting this wrong points five anime at the wrong
    // source and nothing revisits it.
    expect(sourceMatchesWorkType('Light novel', 'Manga')).toBe(false)
  })

  it('links a light novel anime to the light novel', () => {
    expect(sourceMatchesWorkType('Light novel', 'Light Novel')).toBe(true)
  })

  it('does not confuse a light novel with a novel', () => {
    expect(sourceMatchesWorkType('Light novel', 'Novel')).toBe(false)
    expect(sourceMatchesWorkType('Novel', 'Light Novel')).toBe(false)
  })

  it('folds MAL\'s manga spellings together', () => {
    // An anime drawn from a manhwa reports its source as "Manga"; MAL has no
    // other value for it.
    expect(sourceMatchesWorkType('Manga', 'Manhwa')).toBe(true)
    expect(sourceMatchesWorkType('Web manga', 'Manga')).toBe(true)
    expect(sourceMatchesWorkType('4-koma manga', 'Manga')).toBe(true)
    expect(sourceMatchesWorkType('Manga', 'One-shot')).toBe(true)
  })

  it('keeps visual novels away from the manga family', () => {
    expect(sourceMatchesWorkType('Visual novel', 'Manga')).toBe(false)
    expect(sourceMatchesWorkType('Visual novel', 'Novel')).toBe(false)
  })

  it('refuses when either side is unknown', () => {
    // An unverifiable link is worse than an absent one: a null source_work_id
    // is fixed by the next scrape, a wrong one is not.
    expect(sourceMatchesWorkType(null, 'Manga')).toBe(false)
    expect(sourceMatchesWorkType('Manga', null)).toBe(false)
    expect(sourceMatchesWorkType('', '')).toBe(false)
    expect(sourceMatchesWorkType('Original', 'Manga')).toBe(false)
  })
})

describe('pickSourceAdaptation', () => {
  it('still answers with a manga when reading an anime page', () => {
    // The Hellsing anime page, which names the manga it adapts. The manga page
    // fixture above is the other direction and deliberately has no manga
    // adaptation on it -- its only manga entry is a prequel.
    const hellsingAnimePage: AdaptationEntry[] = [
      entry('Adaptation (Manga)', 'https://myanimelist.net/manga/267/Hellsing', 'Hellsing', 'manga'),
    ]

    expect(pickSourceAdaptation(hellsingAnimePage, 'Manga')?.href).toBe(
      'https://myanimelist.net/manga/267/Hellsing',
    )
  })

  it('does not mistake a prequel for the work an anime adapts', () => {
    // Every entry on the Hellsing manga page is either a prequel or an anime,
    // so there is no source adaptation to find and null is the right answer.
    expect(pickSourceAdaptation(HELLSING, 'Manga')).toBeNull()
  })

  it('never returns an anime entry now that both kinds are read', () => {
    // The regression the recordType filter exists to prevent: before it, an
    // anime href could be returned as an anime's own source work.
    const animeOnly = HELLSING.filter((e) => e.recordType === 'anime')

    expect(pickSourceAdaptation(animeOnly, 'Manga')).toBeNull()
  })

  it('uses the sidebar Source to choose between two adaptations', () => {
    const spiceAnimePage: AdaptationEntry[] = [
      entry('Adaptation (Manga)', 'https://myanimelist.net/manga/3299/Ookami', 'manga', 'manga'),
      entry('Adaptation (Light Novel)', 'https://myanimelist.net/manga/9115/Ookami', 'light novel', 'manga'),
    ]

    expect(pickSourceAdaptation(spiceAnimePage, 'Light novel')?.href).toBe(
      'https://myanimelist.net/manga/9115/Ookami',
    )
  })

  it('returns null rather than guessing when nothing decides', () => {
    const ambiguous: AdaptationEntry[] = [
      entry('Adaptation (Manga)', 'https://myanimelist.net/manga/1/A', 'A', 'manga'),
      entry('Adaptation (Manga)', 'https://myanimelist.net/manga/2/B', 'B', 'manga'),
    ]

    expect(pickSourceAdaptation(ambiguous, null)).toBeNull()
  })
})
