import { Injectable, Logger } from '@nestjs/common'
import * as QueryString from 'query-string'
import { ElementHandle } from 'puppeteer'
import { parse as ParseDate } from 'date-fns'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import ClusterManager from '../puppeteer/clusterManager'
import { AnimeService } from '../anime/anime.service'
import { IAnimeRequest } from './interfaces'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'
import { IMyanimelist, RECORD_TYPE } from './repository/interface'

@Injectable()
export class MyanimelistService {
  private readonly logger = new Logger(MyanimelistService.name)
  baseURL = 'https://myanimelist.net'
  animeRequest: IAnimeRequest = {
    basePath: '/topanime.php',
    params: {
      limit: 0,
    },
  }
  constructor(
    private readonly puppeteerService: PuppeteerService,
    private readonly myanimelistlinkRepo: MyanimelistlinkRepository,
    private readonly animeService: AnimeService,
  ) {}

  // async ({ page, data }: any) => getFightersOnPage({ page, data }, addToDb)
  async collectAnime({ page, data }: any) {
    this.logger.debug(`Collecting anime on page ${data}`)
    const url: string = data
    await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      if (request.resourceType() === 'script') request.abort()
      else {
        request.continue()
      }
    })
    await page.goto(url)
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
    await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      if (request.resourceType() === 'script') request.abort()
      else {
        request.continue()
      }
    })
    await page.goto(url)
    this.logger.debug(`Page ${data} loaded`)
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
        [field.toLowerCase().replace(/:/g, '')]: (
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
    const parsedData = {
      title_en: res['english'],
      title_jp: res['japanese'],
      title_synonyms: res['synonyms'] ? res['synonyms'].split(',') : null,
      type: RECORD_TYPE.Anime,
      episodes: res['episodes'] ? parseInt(res['episodes'], 10) : null,
      status: res['status'],
      startDate:
        res['aired'] && res['aired'].split('to')[0]
          ? ParseDate(
              res['aired'].split('to')[0].trim(),
              'LLL d, yyyy',
              new Date(),
            )
          : null,
      endDate:
        res['aired'] && res['aired'].split('to')[1]
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
    }

    this.animeService.upsertAnime(parsedData)

    // await ClusterManager.pageFindOne(page,
  }
}
