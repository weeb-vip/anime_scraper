import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'
import {
  Season,
  SeasonYear,
  createSeasonYear,
  isValidSeasonYear,
} from '../common/season.types'
import { SCRAPE_DATA_TYPES } from './scrape.command'

// The seasons a year is made of, in airing order. `--year` expands to these.
const SEASONS_IN_YEAR: readonly Season[] = [
  Season.WINTER,
  Season.SPRING,
  Season.SUMMER,
  Season.FALL,
]

interface SeasonalCommandOptions {
  season?: SeasonYear
  // `true` when --year is passed with no value, which commander does not run
  // the parser over -- it means "the current year".
  year?: number | boolean
  headless?: boolean
  limit?: number
  data?: string[]
}

@Command({
  name: 'seasonal',
  description: 'Scrape seasonal anime from MyAnimeList',
})
export class SeasonalCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scraperService: ScraperService,
  ) {
    super()
  }

  async run(
    passedParam: string[],
    options?: SeasonalCommandOptions,
  ): Promise<void> {
    const targets = this.resolveTargets(options)
    if (!targets) {
      return
    }

    if (options?.data && options.data.length > 0) {
      this.logger.info(`Scraping only: ${options.data.join(', ')} (+ main)`)
    }

    const failed: SeasonYear[] = []

    // Sequential, and every season runs even if an earlier one threw: a whole
    // year is one cron run, and MAL rate-limiting one season is not a reason
    // to leave the other three unrefreshed. Each scrapeSeasonalAnime call
    // launches and closes its own puppeteer cluster, so they cannot overlap.
    for (const seasonYear of targets) {
      this.logger.info(`Starting seasonal scraping for ${seasonYear}`)
      try {
        await this.scraperService.scrapeSeasonalAnime(
          seasonYear,
          !!options?.headless,
          options?.limit,
          options?.data && options.data.length > 0 ? options.data : null,
        )
        this.logger.info(`Completed seasonal scraping for ${seasonYear}`)
      } catch (error) {
        failed.push(seasonYear)
        this.logger.error(
          `Error during seasonal scraping for ${seasonYear}: ${error.message}`,
          error,
        )
      }
    }

    if (failed.length > 0) {
      this.logger.error(`Seasonal scraping failed for: ${failed.join(', ')}`)
      // exitCode rather than exit(): let the process wind down normally, but
      // fail the pod so a broken run is visible in the CronJob's history.
      process.exitCode = 1
    }
  }

  // Turns the flags into the list of seasons to scrape, or null (having
  // logged why) when they do not describe one.
  private resolveTargets(
    options?: SeasonalCommandOptions,
  ): SeasonYear[] | null {
    const hasYear = options?.year !== undefined && options?.year !== null

    if (hasYear && options?.season) {
      this.logger.error(
        'Use either --season or --year, not both. --year scrapes all four ' +
          'seasons of that year.',
      )
      return null
    }

    if (hasYear) {
      const year =
        options.year === true
          ? new Date().getUTCFullYear()
          : Number(options.year)
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        this.logger.error(
          `Invalid year: ${options.year}. Pass a year like 2026, or --year ` +
            `with no value for the current one.`,
        )
        return null
      }
      return SEASONS_IN_YEAR.map((season) => createSeasonYear(season, year))
    }

    if (!options?.season) {
      this.logger.error(
        'Nothing to scrape: pass --season SUMMER_2025 for one season, or ' +
          '--year for a whole year.',
      )
      return null
    }

    if (!isValidSeasonYear(options.season)) {
      this.logger.error(
        `Invalid season format: ${options.season}. Use format like SUMMER_2025, WINTER_2024, etc.`,
      )
      return null
    }

    return [options.season]
  }

  @Option({
    flags: '-s, --season <season>',
    description: 'Season to scrape (e.g., SUMMER_2025, WINTER_2024)',
  })
  getSeason(val: string): SeasonYear {
    return val as SeasonYear
  }

  @Option({
    flags: '-y, --year [year]',
    description:
      'Scrape all four seasons of a year, e.g. --year 2026. With no value ' +
      "(or 'current') it uses the current year. Mutually exclusive with --season.",
  })
  getYear(val?: string): number | boolean {
    if (val === undefined || val === 'current') {
      return true
    }
    return parseInt(val, 10)
  }

  @Option({
    flags: '-h, --headless',
    description: 'Run headless',
  })
  getHeadless(): boolean {
    return true
  }

  @Option({
    flags: '-l, --limit [limit]',
    description:
      'Puppeteer cluster concurrency, not a cap on how many anime are ' +
      'scraped (default 50)',
  })
  getLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '-D, --data [data]',
    description:
      `Comma-separated data to scrape: ${SCRAPE_DATA_TYPES.join(', ')}. ` +
      `'main' (metadata + seasons) is always scraped; this limits the extra ` +
      `crawls. Defaults to all. e.g. --data main,episodes`,
  })
  getData(val: string): string[] {
    const requested = val
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0)
    const valid = requested.filter((v) =>
      (SCRAPE_DATA_TYPES as readonly string[]).includes(v),
    )
    const invalid = requested.filter(
      (v) => !(SCRAPE_DATA_TYPES as readonly string[]).includes(v),
    )
    if (invalid.length > 0) {
      this.logger.warn(
        `Ignoring unknown --data values: ${invalid.join(', ')}. ` +
          `Valid: ${SCRAPE_DATA_TYPES.join(', ')}`,
      )
    }
    return valid
  }
}
