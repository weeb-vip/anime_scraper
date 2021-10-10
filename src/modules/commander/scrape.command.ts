import * as path from 'path'
import * as fs from 'fs'
import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'

interface BasicCommandOptions {
  site: string
  limit?: number
  headless?: boolean
  file?: string
}

@Command({ name: 'scrape', description: 'A parameter parse' })
export class ScraperCommand implements CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scapperService: ScraperService,
  ) {}

  async run(
    passedParam: string[],
    options?: BasicCommandOptions,
  ): Promise<void> {
    let urls: string[] = null
    if (options?.file !== undefined && options?.file !== null) {
      const contents = fs.readFileSync(
        path.resolve(process.cwd(), options?.file),
        'utf8',
      )
      urls = JSON.parse(contents)
    }
    if (options?.site !== undefined && options?.site !== null) {
      this.scrapeSite(
        passedParam,
        options.site,
        options?.limit,
        !!options?.headless,
        options?.file !== undefined && options?.file !== null ? urls : null,
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
    flags: '-f, --file [file]',
    description: 'Urls from json file (array)',
  })
  getFile(val: string): string {
    this.logger.info(`Pased val: ${val}`)
    return val
  }

  @Option({
    flags: '-h, --headless',
    description: 'Run headless',
  })
  getHeadless(): boolean {
    return true
  }

  scrapeSite(
    param: string[],
    option: string,
    limit: number,
    headless: boolean,
    urls?: string[],
  ): void {
    this.logger.info(`scape site: ${option}`)
    switch (option) {
      case 'anidb':
        this.scapperService.scrapeAnidb(param)
        break
      case 'myanimelist':
        this.scapperService.scrapeMyAnimeList(param, limit, headless, urls)
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
