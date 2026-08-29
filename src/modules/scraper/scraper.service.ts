import { Inject, Injectable } from '@nestjs/common'
import { Logger } from 'winston'
import { AnidbService } from '../anidb/anidb.service'
import { MyanimelistService } from '../myanimelist/myanimelist.service'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import { ScrapeRecordService } from '../scrape_record/scrape_record.service'
import { SeasonYear } from '../common/season.types'

@Injectable()
export class ScraperService {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly puppeteerService: PuppeteerService,
    private readonly anidbService: AnidbService,
    private readonly myanimelistService: MyanimelistService,
    private readonly scrapeRecordService: ScrapeRecordService,
  ) {}

  scrapeSite(url: string) {
    return {
      url,
      title: 'Hello World',
      description: 'This is a description',
      image: 'https://via.placeholder.com/150',
      keywords: ['keyword1', 'keyword2'],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scrapeAnidb(param: string[]) {
    // return this.anidbService.getAnime(anidbId);
    return 'ok'
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async collectAnidb(param: string[]) {
    await this.puppeteerService.setup()
    await this.puppeteerService
      .getManager()
      .task(this.anidbService.collectAnime)
    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          console.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          console.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })
    const urls = this.anidbService.generateAnimeURLs()
    await Promise.all(
      urls.map((url: string) => this.puppeteerService.getManager().queue(url)),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()
    // this.anidbService.collectAnime(this.puppeteerService);
    // return this.anidbService.getAnime(anidbId);
    return 'ok'
  }

  async collectMyanimelist(param: string[], limit: number, headless: boolean) {
    await this.puppeteerService.setup(limit, headless)
    await this.puppeteerService
      .getManager()
      .task(this.myanimelistService.collectAnime.bind(this.myanimelistService))
    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })
    const urls = await this.myanimelistService.generateAnimeListURLs()
    await Promise.all(
      urls.map((url: string) => this.puppeteerService.getManager().queue(url)),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()
    // this.anidbService.collectAnime(this.puppeteerService);
    // return this.anidbService.getAnime(anidbId);
    return 'ok'
  }

  async scrapeMyAnimeList(
    param: string[],
    limit: number,
    headless: boolean,
    urls?: string[],
    excludedUrls?: string[],
    newlyAdded?: boolean,
    days?: number,
    dataTypes?: string[],
  ) {
    await this.puppeteerService.setup(limit, headless)

    // Limit which pieces of data get scraped (main is always the anchor).
    this.myanimelistService.setScrapeDataTypes(dataTypes)

    // Create a dispatcher function that routes to the correct handler
    const taskDispatcher = async ({ page, data }: any) => {
      if (data.type === 'characters_staff') {
        // This is a character/staff scraping task
        return this.myanimelistService.scrapeCharactersAndStaff({ page, data })
      } else {
        // This is a regular anime page scraping
        return this.myanimelistService.scrapeAnimePage({ page, data })
      }
    }

    // Register the dispatcher as the task handler
    await this.puppeteerService
      .getManager()
      .task(taskDispatcher)
    
    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })
    let processUrls: string[] = null
    if (urls) {
      processUrls = urls
    } else {
      processUrls = await this.myanimelistService.generateAnimeURLs({
        new: newlyAdded,
        days: days,
      })
    }
    if (excludedUrls) {
      processUrls = processUrls.filter(
        (url: string) => !excludedUrls.includes(url),
      )
    }
    // Filter out already-scraped URLs for resume capability
    const alreadyScraped = this.scrapeRecordService.getScrapedUrls()
    const beforeCount = processUrls.length
    processUrls = processUrls.filter((url: string) => !alreadyScraped.has(url))
    if (beforeCount !== processUrls.length) {
      this.logger.info(`Resuming: skipping ${beforeCount - processUrls.length} already-scraped URLs, ${processUrls.length} remaining`)
    }
    await Promise.all(
      processUrls.map((url: string) =>
        this.puppeteerService.getManager().queue(url),
      ),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()

    return 'ok'
  }

  /**
   * Scrapes MAL manga pages into `work` rows.
   *
   * URLs are supplied rather than generated. The natural source of them is the
   * anime pages themselves -- step 6 records the source link each anime names --
   * so a discovery crawl of MAL's manga index is not needed to get value out of
   * this: the manga worth having are exactly the ones something adapts.
   */
  async scrapeMyAnimeListManga(
    param: string[],
    limit: number,
    headless: boolean,
    urls?: string[],
  ) {
    await this.puppeteerService.setup(limit, headless)

    await this.puppeteerService
      .getManager()
      .task(
        async ({ page, data }: any) =>
          this.myanimelistService.scrapeMangaPage({ page, data }),
      )

    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })

    let processUrls: string[] = urls && urls.length > 0 ? urls : param
    if (!processUrls || processUrls.length === 0) {
      this.logger.error(
        'No manga URLs given. Pass them as arguments or with --file.',
      )

      return 'no urls'
    }

    // Same resume behaviour as the anime crawl: a run that dies partway through
    // does not start from the beginning.
    const alreadyScraped: Set<string> = this.scrapeRecordService.getScrapedUrls()
    const beforeCount: number = processUrls.length
    processUrls = processUrls.filter((url: string) => !alreadyScraped.has(url))
    if (beforeCount !== processUrls.length) {
      this.logger.info(
        `Resuming: skipping ${beforeCount - processUrls.length} already-scraped URLs, ${processUrls.length} remaining`,
      )
    }

    await Promise.all(
      processUrls.map((url: string) =>
        this.puppeteerService.getManager().queue({ url, type: 'manga' }),
      ),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()

    return 'ok'
  }

  async scrapeNewlyAdded(
    param: string[],
    limit: number,
    headless: boolean,
    urls?: string[],
    excludedUrls?: string[],
  ) {
    await this.puppeteerService.setup(limit, headless)

    // Create a dispatcher function that routes to the correct handler
    const taskDispatcher = async ({ page, data }: any) => {
      if (data.type === 'characters_staff') {
        // This is a character/staff scraping task
        return this.myanimelistService.scrapeCharactersAndStaff({ page, data })
      } else {
        // This is a regular anime page scraping
        return this.myanimelistService.scrapeAnimePage({ page, data })
      }
    }

    // Register the dispatcher as the task handler
    await this.puppeteerService
      .getManager()
      .task(taskDispatcher)

    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })
    let processUrls: string[] = null
    if (urls) {
      processUrls = urls
    } else {
      processUrls = await this.myanimelistService.generateAnimeURLs()
    }
    if (excludedUrls) {
      processUrls = processUrls.filter(
        (url: string) => !excludedUrls.includes(url),
      )
    }
    // Filter out already-scraped URLs for resume capability
    const alreadyScraped = this.scrapeRecordService.getScrapedUrls()
    const beforeCount = processUrls.length
    processUrls = processUrls.filter((url: string) => !alreadyScraped.has(url))
    if (beforeCount !== processUrls.length) {
      this.logger.info(`Resuming: skipping ${beforeCount - processUrls.length} already-scraped URLs, ${processUrls.length} remaining`)
    }
    await Promise.all(
      processUrls.map((url: string) =>
        this.puppeteerService.getManager().queue(url),
      ),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()

    return 'ok'
  }

  async collectNewlyAddedMyanimelist(
    param: string[],
    limit: number,
    headless: boolean,
  ) {
    console.log('collectNewlyAddedMyanimelist')
    await this.puppeteerService.setup(limit, headless)
    await this.puppeteerService
      .getManager()
      .task(
        this.myanimelistService.collectNewAnime.bind(this.myanimelistService),
      )
    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })
    const urls = await this.myanimelistService.generateNewlyAddedURLs()
    await Promise.all(
      urls.map((url: string) => this.puppeteerService.getManager().queue(url)),
    )
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()

    return 'ok'
  }

  async scrapeSeasonalAnime(
    seasonYear: SeasonYear,
    headless: boolean,
    limit?: number,
    dataTypes?: string[],
  ) {
    this.logger.info(`Starting seasonal anime scraping for ${seasonYear}`)

    await this.puppeteerService.setup(limit || 50, headless)

    // Limit which pieces of data get scraped (main is always the anchor).
    this.myanimelistService.setScrapeDataTypes(dataTypes)

    // Create a dispatcher function that routes to the correct handler
    const taskDispatcher = async ({ page, data }: any) => {
      // Check if this is a seasonal collection task (seasonal URL)
      if (data.url && data.url.includes('/anime/season/')) {
        // This is the initial seasonal collection
        return this.myanimelistService.collectSeasonalAnime({ page, data })
      } else if (data.type === 'characters_staff') {
        // This is a character/staff scraping task
        return this.myanimelistService.scrapeCharactersAndStaff({ page, data })
      } else {
        // This is a regular anime page scraping (might have seasonYear for tagging)
        return this.myanimelistService.scrapeAnimePage({ page, data })
      }
    }

    // Register the dispatcher as the task handler
    await this.puppeteerService
      .getManager()
      .task(taskDispatcher)

    this.puppeteerService
      .getManager()
      .getCluster()
      .on('taskerror', (err: any, data: any, willRetry: any) => {
        if (willRetry) {
          this.logger.warn(
            `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`,
          )
        } else {
          this.logger.error(`Failed to crawl ${data}: ${err.message}`)
        }
      })

    const seasonalURL = this.myanimelistService.generateSeasonalURL(seasonYear)
    this.logger.info(`Collecting seasonal anime from: ${seasonalURL}`)
    
    await this.puppeteerService.getManager().queue({
      url: seasonalURL,
      seasonYear: seasonYear,
    })

    // The collectSeasonalAnime method will handle queuing individual anime pages
    await this.puppeteerService.getManager().idle()
    await this.puppeteerService.getManager().close()

    this.logger.info(`Completed seasonal anime scraping for ${seasonYear}`)
    return 'ok'
  }
}
