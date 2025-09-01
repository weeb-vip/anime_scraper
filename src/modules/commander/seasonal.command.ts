import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'
import { SeasonYear, isValidSeasonYear } from '../common/season.types'

interface SeasonalCommandOptions {
  season: SeasonYear
  headless?: boolean
  limit?: number
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
      await this.scraperService.scrapeSeasonalAnime(
        options.season,
        !!options.headless,
        options.limit
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
}