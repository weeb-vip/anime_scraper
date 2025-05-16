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
}


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

  scrapeSite(
    param: string[],
    option: string,
    limit: number,
    headless: boolean,
    urls?: string[],
    excludedUrls?: string[],
    newlyadded?: boolean,
    days?: number,
  ): void {
    this.logger.info(`scape site: ${option}`)
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
          days
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
