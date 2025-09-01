export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
}

export type SeasonYear = `${Uppercase<Season>}_${number}`

export const createSeasonYear = (season: Season, year: number): SeasonYear => {
  return `${season.toUpperCase()}_${year}` as SeasonYear
}

export const parseSeasonYear = (seasonYear: SeasonYear): { season: Season; year: number } => {
  const [seasonStr, yearStr] = seasonYear.split('_')
  const season = seasonStr.toLowerCase() as Season
  const year = parseInt(yearStr, 10)
  
  if (!Object.values(Season).includes(season)) {
    throw new Error(`Invalid season: ${seasonStr}`)
  }
  
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${yearStr}`)
  }
  
  return { season, year }
}

export const isValidSeasonYear = (value: string): value is SeasonYear => {
  try {
    parseSeasonYear(value as SeasonYear)
    return true
  } catch {
    return false
  }
}