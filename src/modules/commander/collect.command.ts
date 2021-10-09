import { Logger } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { ScraperService } from '../scraper/scraper.service'

interface BasicCommandOptions {
  site: string
  limit?: number
}

@Command({ name: 'collect', description: 'A parameter parse' })
export class CollectCommand implements CommandRunner {
  private readonly logger = new Logger(CollectCommand.name)
  constructor(private readonly scapperService: ScraperService) {}

  async run(
    passedParam: string[],
    options?: BasicCommandOptions,
  ): Promise<void> {
    if (options?.site !== undefined && options?.site !== null) {
      this.scrapeSite(passedParam, options.site, options?.limit)
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

  scrapeSite(param: string[], option: string, limit: number): void {
    this.logger.log(`scape site: ${option}`)
    switch (option) {
      case 'anidb':
        this.logger.log('will collect anidb')
        this.scapperService.collectAnidb(param)
        break
      case 'myanimelist':
        this.logger.log('will collect myanimelist')
        this.scapperService.collectMyanimelist(param, limit)
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
