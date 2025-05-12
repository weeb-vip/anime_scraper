import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { Inject } from '@nestjs/common'
import { ScraperService } from '../scraper/scraper.service'

interface BasicCommandOptions {
  site: string
  limit?: number
  headless?: boolean
}

@Command({ name: 'collect', description: 'A parameter parse' })
export class CollectCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scapperService: ScraperService,
  ) {
    super()
  }

  async run(
    passedParam: string[],
    options?: BasicCommandOptions,
  ): Promise<void> {
    if (options?.site !== undefined && options?.site !== null) {
      this.scrapeSite(
        passedParam,
        options.site,
        options?.limit,
        !!options?.headless,
      )
    }
  }

  @Option({
    flags: '-s, --site [site]',
    description: 'What site to scrape',
  })
  getSite(val: string): string {
    return val
  }

  @Option({
    flags: '-l, --limit [limit]',
    description: 'What site to scrape',
  })
  getLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '-h, --headless',
    description: 'Run headless',
  })
  getHeadless(val: string): boolean {
    return true
  }

  scrapeSite(
    param: string[],
    option: string,
    limit: number,
    headless: boolean,
  ): void {
    this.logger.info(`scape site: ${option}`)
    switch (option) {
      case 'anidb':
        this.logger.info('will collect anidb')
        this.scapperService.collectAnidb(param)
        break
      case 'myanimelist':
        this.logger.info('will collect myanimelist')
        this.scapperService.collectMyanimelist(param, limit, headless)
        break
      /*case 'mal':
        this.scapperService.scrapeMal(param);
        break;
      case 'kitsu':
        this.scapperService.scrapeKitsu(param);
        break;
      case 'anilist':
        this.scapperService.scrapeAnilist(param);
        break;*/
      default:
        this.logger.error(`Site ${option} not found`)
    }
  }
}
