import { Injectable, Logger } from '@nestjs/common'
import * as QueryString from 'query-string'
import { ElementHandle } from 'puppeteer'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import { IAnimeRequest } from './interfaces'
import ClusterManager from './../puppeteer/clusterManager'

@Injectable()
export class AnidbService {
  private readonly logger = new Logger(AnidbService.name)
  baseURL = 'https://anidb.net'
  animeRequest: IAnimeRequest = {
    basePath: '/anime',
    params: {
      h: 1,
      noalias: 1,
      'orderby.name': 0.1,
      page: 0,
      view: 'list',
    },
  }
  constructor(private readonly puppeteerService: PuppeteerService) {}

  // async ({ page, data }: any) => getFightersOnPage({ page, data }, addToDb)
  async collectAnime({ page, data }: any) {
    this.logger.debug(`Collecting anime on page ${data.page}`)
    const url: string = data
    await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      if (request.resourceType() === 'script') request.abort()
      else {
        request.continue()
      }
    })
    await page.goto(url)
    this.logger.debug(`Page ${data.page} loaded`)

    /**
     * const linkElements: ElementHandle[] = await ClusterManager
      .findMany(page, '#animelist tr .name.main.anime a');
    const links: readonly { name: string; url: string }[] = await Promise.all(
      linkElements.map(async (element: ElementHandle) => ({
        name: await page.evaluate((el: any) => el.textContent, element),
        url: await page.evaluate((el: any) => el.href, element),
      })),
    );
     */
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(null)
      }, 500000000)
    })
    const animes = await page.evaluate(() => {
      const animes = Array.from(
        document.querySelectorAll('#animelist > tbody > tr'),
      )
      const data = animes.map((anime: any) => {
        const title = anime.querySelector('td[data-lable="Title" > a').innerText
        const url = anime.querySelector('td[data-label="Title" > a').href
        const image = anime.querySelector(
          'td[data-label="Image"] > a > img',
        ).src
        return { title, url, image }
      })
    })
  }

  generateAnimeURLs(): string[] {
    const { basePath, params } = this.animeRequest
    const urls = new Array(500).fill(0).map((_, i) => {
      params['page'] = i
      return `${this.baseURL}${basePath}?${QueryString.stringify(params)}`
    })
    return urls
  }
}
