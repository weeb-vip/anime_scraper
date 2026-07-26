import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'
import { SeasonYear, isValidSeasonYear } from '../common/season.types'
import { SCRAPE_DATA_TYPES } from './scrape.command'

interface SeasonalCommandOptions {
  season: SeasonYear
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
    if (!options?.season) {
      this.logger.error('Season parameter is required. Use format like SUMMER_2025')
      return
    }

    if (!isValidSeasonYear(options.season)) {
      this.logger.error(`Invalid season format: ${options.season}. Use format like SUMMER_2025, WINTER_2024, etc.`)
      return
    }

    this.logger.info(`Starting seasonal scraping for ${options.season}`)
    
    try {
      if (options.data && options.data.length > 0) {
        this.logger.info(`Scraping only: ${options.data.join(', ')} (+ main)`)
      }
      await this.scraperService.scrapeSeasonalAnime(
        options.season,
        !!options.headless,
        options.limit,
        options.data && options.data.length > 0 ? options.data : null,
      )
      this.logger.info(`Completed seasonal scraping for ${options.season}`)
    } catch (error) {
      this.logger.error(`Error during seasonal scraping: ${error.message}`, error)
    }
  }

  @Option({
    flags: '-s, --season <season>',
    description: 'Season to scrape (e.g., SUMMER_2025, WINTER_2024)',
  })
  getSeason(val: string): SeasonYear {
    return val as SeasonYear
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
    description: 'Limit number of anime to scrape',
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