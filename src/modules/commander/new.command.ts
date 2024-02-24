import * as path from 'path'
import * as fs from 'fs'
import { Inject } from '@nestjs/common'
import { Command, CommandRunner, Option, SubCommand } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'

interface BasicCollectCommandOptions {
  csite: string
  climit?: number
  cheadless?: boolean
  file?: string

  excludeFile?: string
}

@SubCommand({
  name: 'new',
  description: 'A parameter parse',
})
export class NewCommand implements CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scapperService: ScraperService,
  ) {}

  async run(
    passedParam: string[],
    options?: BasicCollectCommandOptions,
  ): Promise<void> {
    console.log('running new command')
    console.log(passedParam)
    console.log(options)
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
    if (options?.csite !== undefined && options?.csite !== null) {
      console.log('running new command with -s')
      this.scrapeSite(
        passedParam,
        options.csite,
        options?.climit,
        !!options?.cheadless,
        options?.file !== undefined && options?.file !== null ? urls : null,
        options?.excludeFile !== undefined && options?.excludeFile !== null
          ? excludedUrls
          : null,
      )
    }
  }
  @Option({
    flags: '-cs, --csite [site]',
    description: 'What site to scrape',
  })
  getSite(val: string): string {
    return val
  }

  @Option({
    flags: '-cl, --climit [limit]',
    description: 'Limit the number of items to scrape',
  })
  getLimit(val: string): number {
    return parseInt(val)
  }

  @Option({
    flags: '-ch, --cheadless',
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
    urls?: string[],
    excludedUrls?: string[],
  ): void {
    this.logger.info(`scape site2: ${option}`)
    switch (option) {
      case 'anidb':
        this.scapperService.scrapeAnidb(param)
        break
      case 'myanimelist':
        console.log('starting scrape')
        this.scapperService.collectNewlyAddedMyanimelist(param, limit, headless)
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
