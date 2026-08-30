import * as path from 'path'
import * as fs from 'fs'
import { Inject } from '@nestjs/common'
import { CommandRunner, Option, SubCommand } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'

interface MangaCommandOptions {
  msite: string
  mlimit?: number
  mheadless?: boolean
  file?: string
}

// `scrape manga` -- the manga, light novels and novels anime are adapted from.
//
// Run with no arguments it scrapes every manga link the catalogue has recorded,
// mirroring how `scrape` works for anime. MAL's manga database is far larger
// than the part we care about, and that part is defined by what something
// adapts -- which the anime pages already tell us, so there is nothing to
// discover and no index to crawl.
//
// Arguments or --file narrow it to a specific set instead.
@SubCommand({
  name: 'manga',
  description: 'Scrape MyAnimeList manga pages into works',
})
export class MangaCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scapperService: ScraperService,
  ) {
    super()
  }

  async run(
    passedParam: string[],
    options?: MangaCommandOptions,
  ): Promise<void> {
    let urls: string[] = null
    if (options?.file !== undefined && options?.file !== null) {
      const contents: string = fs.readFileSync(
        path.resolve(process.cwd(), options.file),
        'utf8',
      )
      urls = JSON.parse(contents)
    }

    const site: string = options?.msite || 'myanimelist'
    if (site !== 'myanimelist') {
      this.logger.error(`Site ${site} has no manga pages to scrape`)

      return
    }

    await this.scapperService.scrapeMyAnimeListManga(
      passedParam,
      options?.mlimit,
      !!options?.mheadless,
      urls,
    )
  }

  // Declared, not just read. nest-commander only populates options that have
  // an @Option; the field existing on the options interface is not enough, and
  // TypeScript cannot see the difference. Without this, --file parsed on the
  // parent command, never reached here, and every run ended with "No manga URLs
  // given" while appearing to have been passed a file.
  @Option({
    flags: '--file [file]',
    description: 'JSON file holding an array of MyAnimeList manga URLs',
  })
  getFile(val: string): string {
    return val
  }

  @Option({
    flags: '-ms, --msite [site]',
    description: 'What site to scrape (only myanimelist)',
  })
  getSite(val: string): string {
    return val
  }

  @Option({
    flags: '-ml, --mlimit [limit]',
    description: 'How many pages to scrape concurrently',
  })
  getLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '-mh, --mheadless',
    description: 'Run headless',
  })
  getHeadless(): boolean {
    return true
  }
}
