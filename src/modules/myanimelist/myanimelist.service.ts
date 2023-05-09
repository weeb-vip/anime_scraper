import { Inject, Injectable } from '@nestjs/common'
import * as QueryString from 'query-string'
import { ElementHandle } from 'puppeteer'
import { parse as ParseDate, isValid } from 'date-fns'
import { Logger } from 'winston'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import ClusterManager from '../puppeteer/clusterManager'
import { AnimeService } from '../anime/anime.service'
import { ScrapeRecordService } from '../scrape_record/scrape_record.service'
import { IAnimeRequest } from './interfaces'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'
import { RECORD_TYPE } from './repository/interface'

@Injectable()
export class MyanimelistService {
  baseURL = 'https://myanimelist.net'
  animeRequest: IAnimeRequest = {
    basePath: '/topanime.php',
    params: {
      limit: 0,
    },
  }

  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly puppeteerService: PuppeteerService,
    private readonly myanimelistlinkRepo: MyanimelistlinkRepository,
    private readonly animeService: AnimeService,
    private readonly scrapeRecordService: ScrapeRecordService,
  ) {}

  // async ({ page, data }: any) => getFightersOnPage({ page, data }, addToDb)
  async collectAnime({ page, data }: any) {
    this.logger.debug(`Collecting anime on page ${data}`)
    const url: string = data
    // await page.setRequestInterception(true)
    /*page.on('request', (request: any): void => {
      if (request.resourceType() === 'script') request.abort()
      else {
        request.continue()
      }
    })*/
    await page.goto(url)
    const searchText =
      'We are temporarily restricting site connections due to heavy access.\n' +
      '        Please click "Submit" to verify that you are not a bot.\n' +
      '        \n' +
      '          Some error occured. please try again.'
    try {
      const foundText = await ClusterManager.pageFindOne(
        page,
        '.display-submit .caption',
        'textContent',
      )
      this.logger.debug(`found text: ${foundText}`)
      if (foundText.trim() === searchText) {
        this.logger.debug(`found captcha, will wait 5 secconds`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        this.logger.debug(`clicking button`)
        await page.$eval('button[type="submit"]', (el: any) => el.click())
        this.logger.debug(`waiting 30 seconds`)
        await new Promise((resolve) => setTimeout(resolve, 30 * 1000))
        this.logger.debug(`continue scrape`)
      }
    } catch (error) {
      this.logger.debug('not a captcha')
      this.logger.debug('Scraping page...')
    }
    this.logger.debug(`Page ${data} loaded`)

    const linkElements: ElementHandle[] = await ClusterManager.findMany(
      page,
      'table > tbody tr.ranking-list td.title h3 a',
    )
    const links: readonly { name: string; url: string }[] = await Promise.all(
      linkElements.map(async (element: ElementHandle) => ({
        name: await page.evaluate((el: any) => el.textContent, element),
        url: await page.evaluate((el: any) => el.href, element),
      })),
    )

    await Promise.all(
      links.map((link) => {
        return this.myanimelistlinkRepo.upsert({
          name: link.name,
          link: link.url,
          type: RECORD_TYPE.Anime,
        })
      }),
    )
  }

  generateAnimeListURLs(): string[] {
    const { basePath, params } = this.animeRequest
    const urls = new Array(500).fill(0).map((_, i) => {
      params['limit'] += 50
      return `${this.baseURL}${basePath}?${QueryString.stringify(params)}`
    })
    return urls
  }

  async generateAnimeURLs(): Promise<string[]> {
    return (await this.myanimelistlinkRepo.getAllAnime()).map(
      (IMyanimelist) => IMyanimelist.link,
    )
  }

  async scrapeAnimePage({ page, data }: any) {
    this.logger.debug(`Collecting anime on page ${data}`)
    const url: string = data
    /*await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      if (request.resourceType() === 'script') request.abort()
      else {
        request.continue()
      }
    })*/
    await page.setDefaultNavigationTimeout(60 * 2000)
    await page.goto(url)
    const searchText =
      'We are temporarily restricting site connections due to heavy access.\n' +
      '        Please click "Submit" to verify that you are not a bot.\n' +
      '        \n' +
      '          Some error occured. please try again.'
    try {
      const foundText = await ClusterManager.pageFindOne(
        page,
        '.display-submit .caption',
        'textContent',
      )
      if (foundText.trim() === searchText) {
        this.logger.debug(`found captcha, will wait 5 secconds`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        this.logger.debug(`clicking button`)
        await page.$eval('button[type="submit"]', (el: any) => el.click())
        this.logger.debug(`waiting 30 seconds`)
        await new Promise((resolve) => setTimeout(resolve, 30 * 1000))
        this.logger.debug(`continue scrape`)
      }
    } catch (error) {
      // this.logger.debug('not a captcha')
      this.logger.debug('Scraping page...')
    }
    const elements: ElementHandle[] = await ClusterManager.findMany(
      page,
      '#content td .spaceit_pad',
    )

    const res: any = await elements.reduce(async (acc, element) => {
      let field
      try {
        field = await ClusterManager.findOneGivenElement(
          page,
          element,
          'span',
          'textContent',
        )
      } catch {
        field = 'undefined'
      }
      return {
        ...(await acc),
        [field ? field.toLowerCase().replace(/:/g, '') : 'undefined']: (
          await page.evaluate((el: any) => el.textContent, element)
        )
          .replace(field, '')
          .trim(),
      }
    }, Promise.resolve({}))
    res['synopsis'] = await ClusterManager.pageFindOne(
      page,
      'p[itemprop="description"]',
      'textContent',
    )
    //document.querySelector('.title-name.h1_bold_none').textContent
    const titleHeader = await ClusterManager.pageFindOne(
      page,
      '.title-name.h1_bold_none',
      'textContent',
    )
    res['english'] = res['english'] || titleHeader
    if (!res['english'] && !res['japanese']) {
      throw new Error('No english or japanese title, should retry')
    }
    const rating = await ClusterManager.pageFindOne(
      page,
      '.score .score-label',
      'textContent',
    )
    const links = await ClusterManager.findMany(page, '.external_links a')

    const linkHrefs = Promise.all(
      links.map((link: ElementHandle) => {
        return page.evaluate((el: any) => el.href, link)
      }),
    )

    const anidbLink =
      (await linkHrefs).find((link: string) => {
        return link.includes('https://anidb.net/')
      }) || '?aid='

    // get query params from anidb link
    const anidbquery = anidbLink
      .split('?')[1]
      .split('&')
      .reduce((acc, item) => {
        return {
          [item.split('=')[0]]: item.split('=')[1],
        }
      }, {})

    const anidbId = anidbquery['aid']

    const rankContent = await ClusterManager.pageFindOne(
      page,
      '.numbers.ranked strong',
      'textContent',
    )
    this.logger.debug(`rankContent: ${rankContent}`)
    const rank = rankContent ? parseInt(rankContent.replace('#', ''), 10) : null

    const parsedData = {
      ranking: rank,
      anidbid: anidbId,
      title_en: res['english'],
      title_jp: res['japanese'],
      title_synonyms: res['synonyms'] ? res['synonyms'].split(',') : null,
      type: RECORD_TYPE.Anime,
      episodes: res['episodes'] ? parseInt(res['episodes'], 10) : null,
      status: res['status'],
      startDate:
        res['aired'] &&
        res['aired'].split('to')[0] &&
        isValid(
          ParseDate(
            res['aired'].split('to')[0].trim(),
            'LLL d, yyyy',
            new Date(),
          ),
        )
          ? ParseDate(
              res['aired'].split('to')[0].trim(),
              'LLL d, yyyy',
              new Date(),
            )
          : null,
      endDate:
        res['aired'] &&
        res['aired'].split('to')[1] &&
        isValid(
          ParseDate(
            res['aired'].split('to')[1].trim(),
            'LLL d, yyyy',
            new Date(),
          ),
        )
          ? ParseDate(
              res['aired'].split('to')[1].trim(),
              'LLL d, yyyy',
              new Date(),
            )
          : null,
      genres: res['genres'] ? res['genres'].split(',') : null,
      duration: res['duration'],
      broadcast: res['broadcast'],
      licensors: res['licensors'] ? res['licensors'].split(',') : null,
      studios: res['studios'] ? res['studios'].split(',') : null,
      source: res['source'],
      synopsis: res['synopsis'],
      rating: rating ? rating : null,
    }

    this.animeService.upsertAnime(parsedData)
    this.scrapeRecordService.recordSuccessfulScrape(data)
  }
}
