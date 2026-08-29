// MAL renders an absent list as a placeholder rather than omitting it, and the
// scraper has been storing that placeholder as data. 11,497 of 29,673 anime
// rows -- 38.7% -- have `["None found"," add some"]` sitting in `studios` as
// though those were two real studios.
//
// The leading whitespace in that example is the second half of the problem: the
// list is split on commas without trimming, so `"Sunrise, Inc."` becomes
// `["Sunrise"," Inc."]` and `" Inc."` ends up looking like a studio credited on
// 19 anime.
//
// Cleaning at parse time rather than on read means the dirt never enters the
// column, which is the difference between this and the existing columns.
const PLACEHOLDERS: readonly string[] = ['none found', 'add some', 'none', 'n/a', 'unknown']

export function cleanScrapedList(values: readonly string[] | null): string[] {
  if (!values) {
    return []
  }

  const cleaned: string[] = values
    .map((value: string) => (value ?? '').trim())
    .filter((value: string) => value.length > 0)
    .filter((value: string) => !PLACEHOLDERS.includes(value.toLowerCase()))

  // MAL repeats a credit when someone holds two roles on the same work.
  return Array.from(new Set(cleaned))
}
