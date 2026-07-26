import * as path from 'path'
import * as fs from 'fs'
import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'
import { NewCommand } from './new.command'

interface BasicCommandOptions {
  site: string
  limit?: number
  headless?: boolean
  file?: string
  excludeFile?: string
  new?: boolean
  days?: number
  data?: string[]
}

// The pieces of data a scrape can produce. `main` (anime metadata + MAL link +
// seasons) is always scraped as the anchor; `characters` and `episodes` are the
// expensive extra crawls that this flag lets you skip.
export const SCRAPE_DATA_TYPES = ['main', 'characters', 'episodes'] as const


@Command({
  name: 'scrape',
  description: 'A parameter parse',
  // @ts-ignore
  subCommands: [NewCommand],
})
export class ScraperCommand extends CommandRunner {
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
    let urls: string[] = null
    let excludedUrls: string[] = null
    if (options?.file !== undefined && options?.file !== null) {
      const contents = fs.readFileSync(
        path.resolve(process.cwd(), options?.file),
        'utf8',
      )
      urls = JSON.parse(contents)
    }
    if (options?.excludeFile !== undefined && options?.excludeFile !== null) {
      const contents = fs.readFileSync(
        path.resolve(process.cwd(), options?.excludeFile),
        'utf8',
      )
      // split newlines
      excludedUrls = contents.split(/\r?\n/)
      console.log(excludedUrls)
    }
    if (options?.site !== undefined && options?.site !== null) {
      this.scrapeSite(
        passedParam,
        options.site,
        options?.limit,
        !!options?.headless,
        options?.file !== undefined && options?.file !== null ? urls : null,
        options?.excludeFile !== undefined && options?.excludeFile !== null
          ? excludedUrls
          : null,
        options.new !== undefined && options.new !== null ? options.new : false,
        options?.days !== undefined && options?.days !== null
          ? options.days
          : null,
        options?.data && options.data.length > 0 ? options.data : null,
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
    flags: '-e --exclude-file [exclude-file]',
    description: 'Urls from list ',
  })
  getExcludeFile(val: string): string {
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

  @Option({
    flags: '-n, --new',
    description: 'Scrape only new anime',
  })
  getNew(): boolean {
    return true
  }

  @Option({
    flags: '-d, --days [days]',
    description: 'Days to scrape',
  })
  getDays(val: string): number {
    this.logger.info(`Pased val: ${val}`)
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

  scrapeSite(
    param: string[],
    option: string,
    limit: number,
    headless: boolean,
    urls?: string[],
    excludedUrls?: string[],
    newlyadded?: boolean,
    days?: number,
    dataTypes?: string[],
  ): void {
    this.logger.info(`scape site: ${option}`)
    if (dataTypes && dataTypes.length > 0) {
      this.logger.info(`Scraping only: ${dataTypes.join(', ')} (+ main)`)
    }
    switch (option) {
      case 'anidb':
        this.scapperService.scrapeAnidb(param)
        break
      case 'myanimelist':
        console.log(excludedUrls)
        this.scapperService.scrapeMyAnimeList(
          param,
          limit,
          headless,
          urls,
          excludedUrls,
          newlyadded,
          days,
          dataTypes,
        )
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
