import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'
import { SCRAPE_DATA_TYPES } from './scrape.command'

interface YearCommandOptions {
  headless?: boolean
  limit?: number
  data?: string[]
}

@Command({
  name: 'year',
  arguments: '[year]',
  description:
    'Re-scrape every anime airing in a year. Takes a year or "current" ' +
    '(the default), e.g. `year 2026`',
})
export class YearCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scraperService: ScraperService,
  ) {
    super()
  }

  async run(
    passedParam: string[],
    options?: YearCommandOptions,
  ): Promise<void> {
    const year = this.resolveYear(passedParam[0])
    if (year === null) {
      return
    }

    if (options?.data && options.data.length > 0) {
      this.logger.info(`Scraping only: ${options.data.join(', ')} (+ main)`)
    }

    try {
      await this.scraperService.scrapeAnimeForYear(
        year,
        !!options?.headless,
        options?.limit,
        options?.data && options.data.length > 0 ? options.data : null,
      )
    } catch (error) {
      this.logger.error(
        `Error during yearly re-scrape of ${year}: ${error.message}`,
        error,
      )
      // exitCode rather than exit(): let the process wind down normally, but
      // fail the pod so a broken run is visible in the CronJob's history.
      process.exitCode = 1
    }
  }

  // Resolves the positional argument, or null (having logged why) when it is
  // not a year. Absent and 'current' both mean this year, in UTC -- so a cron
  // can pass a fixed argument and still roll over every January.
  private resolveYear(passed?: string): number | null {
    if (passed === undefined || passed === 'current') {
      return new Date().getUTCFullYear()
    }

    const year = parseInt(passed, 10)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      this.logger.error(
        `Invalid year: ${passed}. Pass a year like 2026, 'current', or ` +
          `nothing at all for the current year.`,
      )

      return null
    }

    return year
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
