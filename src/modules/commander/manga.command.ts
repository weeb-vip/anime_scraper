import * as path from 'path'
import * as fs from 'fs'
import { Inject } from '@nestjs/common'
import { CommandRunner, Option, SubCommand } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'

interface MangaCommandOptions {
  site?: string
  limit?: number
  headless?: boolean
  file?: string
  // The prefixed spellings this command used to require, kept working so the
  // scrape jobs and scripts already written against them do not break.
  msite?: string
  mlimit?: number
  mheadless?: boolean
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

    // The plain spelling wins, the prefixed one is the fallback.
    const site: string = options?.site || options?.msite || 'myanimelist'
    if (site !== 'myanimelist') {
      this.logger.error(`Site ${site} has no manga pages to scrape`)

      return
    }

    await this.scapperService.scrapeMyAnimeListManga(
      passedParam,
      options?.limit ?? options?.mlimit,
      !!(options?.headless || options?.mheadless),
      urls,
    )
  }

  // Declared, not just read. nest-commander only populates options that have
  // an @Option; the field existing on the options interface is not enough, and
  // TypeScript cannot see the difference.
  //
  // Declaring it was necessary but not sufficient: the parent `scrape` command
  // also owns -f, --file, and until positional options were enabled commander
  // matched the parent's option anywhere on the line. So --file went to the
  // parent regardless of this decorator, and every run ended with "No manga
  // URLs given" while appearing to have been passed a file.
  @Option({
    flags: '--file [file]',
    description: 'JSON file holding an array of MyAnimeList manga URLs',
  })
  getFile(val: string): string {
    return val
  }

  // The plain names, which only became available once options started belonging
  // to the command they follow. The prefixed spellings below are kept as
  // aliases: the scrape jobs in the cluster pass --msite and --mheadless, and
  // renaming an option is not worth breaking a running backfill over.
  @Option({
    flags: '--site [site]',
    description: 'What site to scrape (only myanimelist)',
  })
  getPlainSite(val: string): string {
    return val
  }

  @Option({
    flags: '--limit [limit]',
    description: 'How many pages to scrape concurrently',
  })
  getPlainLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '--headless',
    description: 'Run headless',
  })
  getPlainHeadless(): boolean {
    return true
  }

  @Option({
    flags: '-ms, --msite [site]',
    description: 'Deprecated alias for --site',
  })
  getSite(val: string): string {
    return val
  }

  @Option({
    flags: '-ml, --mlimit [limit]',
    description: 'Deprecated alias for --limit',
  })
  getLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '-mh, --mheadless',
    description: 'Deprecated alias for --headless',
  })
  getHeadless(): boolean {
    return true
  }
}
