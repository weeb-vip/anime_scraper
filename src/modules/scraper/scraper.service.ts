import { Inject, Injectable } from '@nestjs/common'
import { Logger } from 'winston'
import { AnidbService } from '../anidb/anidb.service'
import { MyanimelistService } from '../myanimelist/myanimelist.service'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import { ScrapeRecordService } from '../scrape_record/scrape_record.service'

@Injectable()
export class ScraperService {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly puppeteerService: PuppeteerService,
    private readonly anidbService: AnidbService,
    private readonly myanimelistService: MyanimelistService,
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
    days?: number
  ) {
    await this.puppeteerService.setup(limit, headless)

    await this.puppeteerService
      .getManager()
      .task(
        this.myanimelistService.scrapeAnimePage.bind(this.myanimelistService),
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
    await Promise.all(
      processUrls.map((url: string) =>
        this.puppeteerService.getManager().queue(url),
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

    await this.puppeteerService
      .getManager()
      .task(
        this.myanimelistService.scrapeAnimePage.bind(this.myanimelistService),
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
}
