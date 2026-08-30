import { Inject } from '@nestjs/common'
import { CommandRunner, Option, SubCommand } from 'nest-commander'
import { Logger } from 'winston'
import { ScraperService } from '../scraper/scraper.service'

interface CollectMangaCommandOptions {
  site?: string
  limit?: number
  headless?: boolean
  pages?: number
}

// `collect manga` -- walks MAL's manga ranking and records what it finds.
//
// The counterpart of `collect` for anime, and needed for one reason only: manga
// nothing adapts. A manga that an anime is based on arrives without any crawl,
// because the anime scrape records each source as it goes. That covers roughly
// ten thousand of MAL's sixty thousand entries; the other fifty thousand have
// no anime pointing at them and can only be found by walking the ranking.
//
// Run it before `scrape manga`, which reads whatever links are in the table.
@SubCommand({
  name: 'manga',
  description: 'Collect MyAnimeList manga links, including unadapted ones',
})
export class CollectMangaCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly scapperService: ScraperService,
  ) {
    super()
  }

  async run(
    passedParam: string[],
    options?: CollectMangaCommandOptions,
  ): Promise<void> {
    const site: string = options?.site || 'myanimelist'
    if (site !== 'myanimelist') {
      this.logger.error(`Site ${site} has no manga ranking to collect`)

      return
    }

    await this.scapperService.collectMyanimelistManga(
      passedParam,
      options?.limit,
      !!options?.headless,
      options?.pages,
    )
  }

  @Option({
    flags: '--site [site]',
    description: 'What site to collect from (only myanimelist)',
  })
  getSite(val: string): string {
    return val
  }

  @Option({
    flags: '--limit [limit]',
    description: 'How many pages to crawl concurrently',
  })
  getLimit(val: string): number {
    return parseInt(val, 10)
  }

  @Option({
    flags: '--headless',
    description: 'Run headless',
  })
  getHeadless(): boolean {
    return true
  }

  // Fifty entries a page. The default walks the whole ranking; a smaller number
  // takes the popular end without crawling the long tail, which is most of it.
  @Option({
    flags: '--pages [pages]',
    description: 'How many ranking pages to walk (50 manga each, default 1700)',
  })
  getPages(val: string): number {
    return parseInt(val, 10)
  }
}
