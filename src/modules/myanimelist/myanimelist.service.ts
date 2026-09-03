import { Inject, Injectable } from '@nestjs/common'
import * as QueryString from 'query-string'
import { ElementHandle } from 'puppeteer'
import { parse as ParseDate, isValid, parse } from 'date-fns'
import { Logger } from 'winston'
import { PuppeteerService } from '../puppeteer/puppeteer.service'
import ClusterManager from '../puppeteer/clusterManager'
import { AnimeService } from '../anime/anime.service'
import { ScrapeRecordService } from '../scrape_record/scrape_record.service'
import { AnimeEpisodesEntity } from '../anime/repository/animeEpisodes.entity'
import clusterManager from '../puppeteer/clusterManager'
import { IAnimeRequest } from './interfaces'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'
import { RECORD_TYPE } from './repository/interface'
import { AnimeStaffEntity } from '../anime/repository/animeStaff.entity'
import { AnimeCharacterEntity } from '../anime/repository/animeCharacters.entity'
import { SeasonYear, parseSeasonYear, Season } from '../common/season.types'
import { WorkService } from '../work/work.service'
import { cleanScrapedList } from '../common/scrapedList'
import {
  readAdaptations,
  pickSourceAdaptation,
  pickAnimeAdaptations,
  sourceMatchesWorkType,
  AdaptationEntry,
} from './relatedEntries'
import {
  readSidebar,
  readRomajiTitle,
  rowHrefs,
  rowText,
  rowList,
  malNumber,
  toWorkType,
  malIdFromUrl,
  parsePublished,
  SidebarRow,
} from './mangaPage'

@Injectable()
export class MyanimelistService {
  baseURL = 'https://myanimelist.net'
  animeRequest: IAnimeRequest = {
    basePath: '/topanime.php',
    params: {
      limit: 0,
    },
  }
  // The manga ranking, which is the same table as /topanime.php. Its params are
  // built per page rather than mutated in place, so generating the list twice
  // in one process does not start where the last run left off.
  mangaRequest: IAnimeRequest = {
    basePath: '/topmanga.php',
    params: {
      limit: 0,
    },
  }

  // Which pieces of data to scrape. `main` (anime metadata + seasons) is always
  // the anchor; `characters` and `episodes` are the expensive extra crawls that
  // the `--data` flag can skip. Defaults to everything.
  private scrapeDataTypes: Set<string> = new Set(['main', 'characters', 'episodes'])

  setScrapeDataTypes(types?: string[]): void {
    this.scrapeDataTypes =
      types && types.length > 0
        ? new Set(types.map((t) => t.toLowerCase()))
        : new Set(['main', 'characters', 'episodes'])
  }

  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly puppeteerService: PuppeteerService,
    private readonly myanimelistlinkRepo: MyanimelistlinkRepository,
    private readonly animeService: AnimeService,
    private readonly scrapeRecordService: ScrapeRecordService,
    private readonly workService: WorkService,
  ) {
  }

  /**
   * Collects anime names from myanimelist
   * @param page
   * @param data
   */
  async collectAnime({ page, data }: any) {
    return this.collectRankingPage(page, data, RECORD_TYPE.Anime)
  }

  /**
   * Collects manga from MyAnimeList's ranking pages.
   *
   * The counterpart to collectAnime, and the only way to reach a manga nothing
   * adapts. Manga that anime are based on arrive on their own -- the anime
   * scrape records each source as it goes -- but that reaches roughly ten
   * thousand of MAL's sixty thousand. The rest have to be discovered, and
   * /topmanga.php is the same ranking table as /topanime.php, so the crawl is
   * identical down to the selector.
   */
  async collectManga({ page, data }: any) {
    return this.collectRankingPage(page, data, RECORD_TYPE.Manga)
  }

  /**
   * One page of a MAL ranking table, recorded as links of the given type.
   *
   * Shared because /topanime.php and /topmanga.php are the same page with
   * different rows: same ranking-list markup, same captcha interstitial, same
   * fifty entries. Only the record type written at the end differs.
   */
  private async collectRankingPage(
    page: any,
    data: any,
    recordType: RECORD_TYPE,
  ) {
    this.logger.debug(`Collecting ${recordType} on page ${data}`)
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
    console.log(linkElements)
    const links: readonly { name: string; url: string }[] = await Promise.all(
      linkElements.map(async (element: ElementHandle) => ({
        name: await page.evaluate((el: any) => el.textContent, element),
        url: await page.evaluate((el: any) => el.href, element),
      })),
    )
    console.log(links)

    // remove query params from link.url
    links.forEach((link) => {
      link.url = link.url.split('?')[0]
    })
    await Promise.all(
      links.map((link) => {
        return this.myanimelistlinkRepo.upsert({
          name: link.name,
          link: link.url,
          type: recordType,
        })
      }),
    )
  }

  /**
   * Collects newly added anime from myanimelist
   * @param page
   * @param data
   */
  async collectNewAnime({ page, data }: any) {
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
      'table > tbody tr div.title > a:nth-child(2)',
    )
    const links: readonly { name: string; url: string }[] = await Promise.all(
      linkElements.map(async (element: ElementHandle) => ({
        name: await page.evaluate((el: any) => el.textContent, element),
        url: await page.evaluate((el: any) => el.href, element),
      })),
    )

    // remove query params from link
    links.forEach((link) => {
      link.url = link.url.split('?')[0]
    })

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

  /**
   * Ranking pages for the manga crawl, fifty entries each.
   *
   * Paged rather than fixed at 500 like the anime list because the two
   * catalogues are not the same size, and getting this wrong is silent: the
   * crawl simply stops early and the manga past that point look like they do
   * not exist.
   *
   * 1700 covers the ranking with room to spare. Measured against MAL rather
   * than guessed -- ?limit=80000 still returns a full page of fifty and
   * ?limit=90000 returns nothing, so the tail sits between the two and 85,000
   * clears it. Pages past the end return no rows and record nothing, which
   * costs a page load and breaks nothing.
   *
   * A smaller number takes the popular end without crawling the tail.
   */
  generateMangaListURLs(pages = 1700): string[] {
    const { basePath } = this.mangaRequest

    return new Array(pages).fill(0).map(
      (_, i: number) => `${this.baseURL}${basePath}?${QueryString.stringify({ limit: i * 50 })}`,
    )
  }

  async generateNewlyAddedURLs(): Promise<string[]> {
    const basePath = '/anime.php'
    const params = {
      o: '9',
      'c[0]': 'a',
      'c[1]': 'd',
      cv: '2',
      w: '1',
      show: 0
    }

    const urls = [`${this.baseURL}${basePath}?${QueryString.stringify(params)}`, ...(new Array(20).fill(0).map((_, i) => {
      params['show'] += 50
      return `${this.baseURL}${basePath}?${QueryString.stringify(params)}`
    }))]
    return urls
  }

  // generate anime urls, default for new is false
  async generateAnimeURLs(
    { new: isNew = false, days: days = 1 }: { new: boolean, days?: number } = { new: false },
  ): Promise<string[]> {
    if (isNew) {
      return (await this.myanimelistlinkRepo.getAllNewAnime(days)).map(
        (IMyanimelist) => IMyanimelist.link,
      )
    }
    return (await this.myanimelistlinkRepo.getAllAnime()).map(
      (IMyanimelist) => IMyanimelist.link,
    )
  }

  /**
   * Every manga URL the catalogue knows it wants.
   *
   * The manga counterpart of generateAnimeURLs, and the reason `scrape manga`
   * needs no discovery crawl and no file. Anime links are gathered by `collect`
   * walking MAL's index; manga links arrive on their own, because
   * captureSourceWork records the source each anime names while the anime is
   * being scraped. The list is therefore already exactly the manga something
   * adapts, which is the only part of MAL's 60,000+ manga worth having.
   */
  async generateMangaURLs(): Promise<string[]> {
    return (await this.myanimelistlinkRepo.findAllByType(RECORD_TYPE.Manga)).map(
      (IMyanimelist) => IMyanimelist.link,
    )
  }

  generateSeasonalURL(seasonYear: SeasonYear): string {
    const { season, year } = parseSeasonYear(seasonYear)
    return `${this.baseURL}/anime/season/${year}/${season}`
  }

  async collectSeasonalAnime({ page, data }: any) {
    this.logger.debug(`Collecting seasonal anime on page ${data.url}`)
    const url: string = data.url
    const seasonYear: SeasonYear = data.seasonYear

    await page.goto(url)
    await this.handleCaptchas(page)
    this.logger.debug(`Page ${url} loaded`)

    // Use the more direct selector for seasonal anime links
    const links: readonly { name: string; url: string }[] = await page.evaluate(() => {
      return [...document.querySelectorAll('.seasonal-anime-list.js-seasonal-anime-list.js-seasonal-anime-list-key-1 .link-title')].map(a => ({
        name: a.textContent?.trim() || 'Unknown',
        url: (a as HTMLAnchorElement).href
      }));
    })

    // remove query params from link.url
    links.forEach((link) => {
      link.url = link.url.split('?')[0]
    })

    // Save links to database
    await Promise.all(
      links.map((link) => {
        return this.myanimelistlinkRepo.upsert({
          name: link.name,
          link: link.url,
          type: RECORD_TYPE.Anime,
        })
      }),
    )

    this.logger.info(`Collected ${links.length} seasonal anime for ${seasonYear}`)

    // Queue ALL anime pages for scraping (limit controls concurrency, not quantity)
    this.logger.info(`Queuing ${links.length} anime pages for scraping`)
    
    for (const link of links) {
      await this.puppeteerService.getManager().queue({
        url: link.url,
        seasonYear: seasonYear,
      })
    }
  }

  private async handleCaptchas(page: any) {
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
        return this.handleCaptchas(page)
      }
    } catch (error) {
      // this.logger.debug('not a captcha')
      this.logger.debug('Scraping page...')
    }
  }

  private async gotoWithTimeout(page: any, url: string, timeoutMs: number = 15000): Promise<boolean> {
    try {
      await Promise.race([
        page.goto(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Page load timeout')), timeoutMs)
        )
      ]);
      this.logger.debug(`Page loaded successfully: ${url}`);
      return true;
    } catch (error) {
      if (error.message === 'Page load timeout') {
        this.logger.warn(`Page load timed out after ${timeoutMs}ms, continuing with partial data: ${url}`);
      } else {
        this.logger.warn(`Page load failed, continuing with partial data: ${url}`, error.message);
      }
      return false;
    }
  }

  async scrapeAnimePage({ page, data }: any) {
    this.logger.debug(`Collecting anime on page ${data.url || data}`)
    const url: string = data.url || data
    const seasonYear: SeasonYear | null = data.seasonYear || null
    await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      // if request ends in js, abort
      if (request.url().endsWith('.js')) {
        request.abort()
      } else {
        request.continue()
      }
      // if (request.resourceType() === 'script') request.abort()
      // else {
      //   request.continue()
      // }
    })
    await page.setDefaultNavigationTimeout(5 * 60 * 1000);
    const pageLoaded = await this.gotoWithTimeout(page, url);
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for anime: ${url}`);
    }
    await this.handleCaptchas(page)
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
    if (
      await ClusterManager.pageFindOne(page, '.viewOpEdMore', 'textContent')
    ) {
      await page.$eval('.viewOpEdMore', (el: any) => el.click())
    }
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
        return link.includes('anidb.net/')
      }) || '?aid='

    // get query params from anidb link
    const anidbquery = anidbLink
      ?.split('?')[1]
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

    function getFirstHalfIfEqual(str) {
      // Check if the string length is even
      if (str.length % 2 !== 0) {
        return null // or handle odd length strings as needed
      }

      // Split the string in half
      const halfLength = str.length / 2
      const firstHalf = str.slice(0, halfLength)
      const secondHalf = str.slice(halfLength)

      // Check if both halves are equal
      if (firstHalf === secondHalf) {
        return firstHalf
      } else {
        return str // or handle unequal halves as needed
      }
    }

    const genres: string[] = (res['genres'] ? res['genres'].split(',') : []).map(
      // clear out whitespace before and after
      genre => genre.trim(),
    ).map(
      genre => getFirstHalfIfEqual(genre),
    )
    const parsedData = {
      image_url: await ClusterManager.pageFindOne(page, '.leftside img', 'src'),
      ranking: rank,
      anidbid: anidbId,
      title_en: res['english'],
      title_jp: res['japanese'],
      title_synonyms: res['synonyms'] ? res['synonyms'].split(',') : null,
      type: res['type'],
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
      genres,
      duration: res['duration'],
      broadcast: res['broadcast'],
      licensors: res['licensors'] ? res['licensors'].split(',') : null,
      studios: res['studios'] ? res['studios'].split(',') : null,
      source: res['source'],
      synopsis: res['synopsis'],
      rating: rating ? rating : null,
    }
    // find image by meta tag if its null
    var image = parsedData.image_url
    if (image == null) {
      image = await ClusterManager.pageFindOne(
        page,
        'meta[property="og:image"]',
        'content',
      )
    }
    parsedData.image_url = image
    console.log(image)
    let parsedStartDate: Date | null = null

    if (res['aired']?.toLowerCase() === 'not available' || res['aired'] == undefined) {
      parsedStartDate = null
    } else {
      const airedFirstPart = res['aired'].split('to')[0].trim()
      // Try parsing with year-only format first
      parsedStartDate = isValid(parsedData.startDate)
        ? parsedData.startDate
        : ParseDate(airedFirstPart, 'yyyy', new Date())

      // If parsing failed, try "Oct 2025" format
      if (!isValid(parsedStartDate)) {
        const dateParts = airedFirstPart.split(' ').filter(Boolean)

        if (dateParts.length === 2) {
          const [month, year] = dateParts
          const formatted = `${month} 1, ${year}`
          parsedStartDate = ParseDate(formatted, 'MMM d, yyyy', new Date())

          if (!isValid(parsedStartDate)) {
            console.warn('Still invalid:', formatted)
            parsedStartDate = null
          }
        }
      }
    }

    // remove query param from link
    const sanitizedURL = url.split('?')[0]

    // Use the new method that enforces MyAnimeList link requirement
    const upsertedAnime = await this.animeService.upsertAnimeWithMyAnimeListLink(
      {
        ...parsedData,
        startDate: parsedStartDate,
      },
      sanitizedURL,
      parsedData.title_en || parsedData.title_jp || 'Unknown',
    )

    // Record which work this anime adapts, if the page says.
    await this.captureSourceWork(page, upsertedAnime.id, res['source'])

    // Add season tracking if seasonYear is provided
    if (seasonYear && upsertedAnime.id) {
      try {
        await this.animeService.addAnimeSeason(
          upsertedAnime.id,
          seasonYear,
          // You can add logic here to determine status based on MyAnimeList data
          // For now, we'll default to UNKNOWN and let users classify later
        )
        this.logger.debug(`Added season ${seasonYear} for anime: ${upsertedAnime.title_en}`)
      } catch (e) {
        this.logger.error(
          `Error adding season ${seasonYear} for ${upsertedAnime.title_en}: ${e.message}`,
        )
      }
    }

    // Queue character and staff scraping as a separate task (skipped unless
    // 'characters' is in the requested --data set).
    if (this.scrapeDataTypes.has('characters')) {
      try {
        await this.puppeteerService.getManager().queue({
          url,
          id: upsertedAnime.id,
          type: 'characters_staff',
        })
        this.logger.debug(`Queued character/staff scraping for ${upsertedAnime.title_en}`)
      } catch (e) {
        this.logger.error(
          `Error queuing characters and staff scraping for ${upsertedAnime.title_en}`,
          e,
        )
      }
    } else {
      this.logger.debug(`Skipping character/staff scraping for ${upsertedAnime.title_en} (not in --data)`)
    }

    // Queue episode scraping (skipped unless 'episodes' is in the --data set).
    if (this.scrapeDataTypes.has('episodes')) {
      try {
        await this.puppeteerService.clusterManager.queue({
          url,
          id: upsertedAnime.id,
        }, async ({ page, data }) => {
          await this.scrapeEpisode({ page, data });
        });
        this.logger.info(`Queued episode scraping for ${upsertedAnime.title_en}`);
      } catch (e) {
        this.logger.error(
          `Error queuing episodes for ${upsertedAnime.title_en}`,
          e,
        )
      }
    } else {
      this.logger.debug(`Skipping episode scraping for ${upsertedAnime.title_en} (not in --data)`)
    }

    this.scrapeRecordService.recordSuccessfulScrape(data)
  }


  /**
   * Records each author's MyAnimeList page against their name.
   *
   * Stored unresolved, the same way a source work is: the URL is kept now and
   * turned into one of our ids whenever that person is scraped. MyAnimeList
   * serves authors from /people/<id>, the same namespace as the voice actors
   * this scraper already collects, so an author is not a new kind of record --
   * it is a person we have a link to and have not fetched yet.
   *
   * Worth keeping even before anything reads it. A name is not an identity:
   * MyAnimeList romanises inconsistently and rewrites entries, which is exactly
   * how myanimelist_link accumulated 486 duplicates keyed on titles. The id in
   * the URL is stable, and recovering it later would mean re-scraping every
   * manga page rather than reading a column.
   */
  private async recordAuthorLinks(rows: SidebarRow[], workId: string): Promise<void> {
    const names: string[] = rowList(rows, 'authors')
    const hrefs: string[] = rowHrefs(rows, 'authors')

    for (let i = 0; i < hrefs.length; i++) {
      const href: string = (hrefs[i] || '').split('?')[0]
      // Only people links. The row can carry others, and a link we cannot key
      // on is worse than no link at all.
      if (!/\/people\/\d+/.test(href)) {
        continue
      }

      try {
        await this.myanimelistlinkRepo.upsert({
          name: names[i] || href,
          link: href,
          type: RECORD_TYPE.Staff,
        })
      } catch (e) {
        // One unrecordable author is not a reason to fail a scraped work.
        this.logger.warn(`Could not record author link ${href} for work ${workId}: ${e.message}`)
      }
    }
  }

  /**
   * Links an anime to the work it adapts.
   *
   * MAL states the source twice. The sidebar gives the kind -- "Manga", "Light
   * novel" -- and Related Entries gives the actual entries, and for a light
   * novel series both an Adaptation (Manga) and an Adaptation (Light Novel) are
   * routinely listed. Spice & Wolf is the clear case: the anime adapts the
   * novel, and the manga is a sibling adaptation of it. The sidebar's Source is
   * what tells the two apart, so it is passed in rather than guessed at.
   *
   * When the work has not been scraped yet the URL is stored unresolved, which
   * is the point of myanimelist_link carrying a record_id: the link survives,
   * `scrape manga` can be pointed at it, and a later pass over the anime
   * resolves it. Nothing is lost by not knowing yet.
   */
  private async captureSourceWork(
    page: any,
    animeId: string,
    source: string | null,
  ): Promise<void> {
    if (!animeId) {
      return
    }

    try {
      const entries: AdaptationEntry[] = await page.evaluate(readAdaptations)
      const picked: AdaptationEntry = pickSourceAdaptation(entries, source)
      if (!picked) {
        return
      }

      const link: string = picked.href.split('?')[0]
      const resolved = await this.myanimelistlinkRepo.resolveByLink(link)

      if (resolved && resolved.recordId) {
        await this.animeService.setSourceWork(animeId, resolved.recordId)
        this.logger.debug(`Linked anime ${animeId} to work ${resolved.recordId}`)

        return
      }

      // Not scraped yet. Keep the URL so it can be, and so this resolves on a
      // later pass instead of being rediscovered from scratch.
      await this.myanimelistlinkRepo.upsert({
        name: picked.title,
        link,
        type: RECORD_TYPE.Manga,
      })
      this.logger.debug(`Recorded unresolved source work ${link} for anime ${animeId}`)
    } catch (e) {
      // A missing source relation is not a reason to fail the anime scrape.
      this.logger.warn(`Could not capture source work for anime ${animeId}: ${e.message}`)
    }
  }

  /**
   * Scrapes a MAL manga page into a `work` row.
   *
   * The manga family -- manga, light novels, novels, manhwa, manhua, one-shots
   * -- all live at /manga/<id> and differ only by the Type field, so this one
   * path covers every source an anime can be adapted from that MAL knows about.
   * That is roughly 10,300 anime: everything except originals and the game and
   * visual novel sources, which need VNDB or IGDB.
   *
   * Same cluster, session and captcha handling as scrapeAnimePage. What differs
   * is the sidebar, which is read as structure rather than text -- see
   * mangaPage.ts for why splitting it on commas is not an option.
   */
  public async scrapeMangaPage({ page, data }: any): Promise<void> {
    const url: string = data.url || data
    this.logger.debug(`Scraping manga page ${url}`)

    await page.setRequestInterception(true)
    page.on('request', (request: any): void => {
      if (request.url().endsWith('.js')) {
        request.abort()
      } else {
        request.continue()
      }
    })
    await page.setDefaultNavigationTimeout(5 * 60 * 1000)

    const pageLoaded: boolean = await this.gotoWithTimeout(page, url)
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for manga: ${url}`)
    }
    await this.handleCaptchas(page)

    const rows: SidebarRow[] = await page.evaluate(readSidebar)

    // The page heading, read structurally -- see readRomajiTitle. It replaces
    // `.title-name.h1_bold_none`, which is the *anime* page's selector: a manga
    // page carries no element of that class, so this read returned null on
    // every manga ever scraped and the romanised title -- the only name MAL
    // always shows -- went nowhere.
    let titleRomaji: string = await page.evaluate(readRomajiTitle)
    if (!titleRomaji) {
      // og:title carries the same string and lives in <head>, so it survives a
      // partial page load -- worth having when load timeouts are routine.
      const ogTitle: string = await ClusterManager.pageFindOne(
        page,
        'meta[property="og:title"]',
        'content',
      )
      titleRomaji = ogTitle ? ogTitle.trim() : null
    }

    // Falls back to the heading, the same way scrapeAnimePage does with
    // `res['english'] = res['english'] || titleHeader`. MAL's heading is the
    // name the page is actually titled by -- "Vista Da Gigantessa" -- and a
    // row whose only name is in kana is unslugable, unsearchable and unlinkable.
    // Keeping the fallback is what leaves `anime` with 3 uuid slugs out of
    // 29,725 where `work` had 44,591 out of 81,213.
    //
    // titleRomaji keeps the unambiguous copy regardless, so a work with a real
    // English title still records both names rather than losing one to the
    // other.
    const titleEn: string = rowText(rows, 'english') || titleRomaji
    const titleJp: string = rowText(rows, 'japanese')

    // The same guard scrapeAnimePage uses: a page with no title at all did not
    // load properly, and retrying is better than writing an empty row.
    if (!titleEn && !titleJp) {
      throw new Error('No title of any kind, should retry')
    }

    let imageUrl: string = await ClusterManager.pageFindOne(
      page,
      '.leftside img',
      'src',
    )
    if (!imageUrl) {
      imageUrl = await ClusterManager.pageFindOne(
        page,
        'meta[property="og:image"]',
        'content',
      )
    }

    const synopsis: string = await ClusterManager.pageFindOne(
      page,
      'span[itemprop="description"]',
      'textContent',
    )

    const rankContent: string = await ClusterManager.pageFindOne(
      page,
      '.numbers.ranked strong',
      'textContent',
    )
    const scoreLabel: string = await ClusterManager.pageFindOne(
      page,
      '.score .score-label',
      'textContent',
    )

    const published = parsePublished(rowText(rows, 'published'), ParseDate, isValid)

    const sanitizedURL: string = url.split('?')[0]

    const work = await this.workService.upsertWork({
      malId: malIdFromUrl(sanitizedURL),
      type: toWorkType(rowText(rows, 'type')),
      titleEn,
      titleRomaji,
      titleJp,
      // Synonyms are the one list MAL leaves as plain comma-separated text.
      titleSynonyms: cleanScrapedList(
        (rowText(rows, 'synonyms') || '').split(','),
      ),
      synopsis,
      imageUrl,
      status: rowText(rows, 'status'),
      volumes: malNumber(rowText(rows, 'volumes')),
      chapters: malNumber(rowText(rows, 'chapters')),
      publishedFrom: published.from,
      publishedTo: published.to,
      // Cleaned like the lists are: MAL writes an absent serialization as the
      // literal "None", and demographic is simply missing on light novels.
      demographic: cleanScrapedList(rowList(rows, 'demographic')).join(', ') || null,
      serialization: cleanScrapedList(rowList(rows, 'serialization')).join(', ') || null,
      authors: cleanScrapedList(rowList(rows, 'authors')),
      score: malNumber(scoreLabel),
      ranking: malNumber(rankContent),
      members: malNumber(rowText(rows, 'members')),
      favorites: malNumber(rowText(rows, 'favorites')),
    })

    // Record the URL against the work, so an anime page naming this manga can
    // resolve it later. This is the same table the anime path uses; record_id
    // is what lets it point at something that is not an anime.
    await this.myanimelistlinkRepo.upsert({
      name: titleEn || titleJp,
      link: sanitizedURL,
      type: RECORD_TYPE.Manga,
      recordId: work.id,
    })

    await this.recordAuthorLinks(rows, work.id)

    await this.linkAdaptedAnime(page, work.id, rowText(rows, 'type'))

    this.scrapeRecordService.recordSuccessfulScrape(sanitizedURL)
    this.logger.info(`Scraped manga ${titleEn || titleJp} (${work.id})`)
  }

  /**
   * Points the anime this work was adapted into back at it.
   *
   * The same relation the anime scrape captures, read from the other end. It
   * matters because the two ends are not equally available: the catalogue holds
   * every anime long before it holds the manga, so at the moment a work is
   * first scraped its anime are already here waiting to be linked. Without
   * this, setting source_work_id needs a second full pass over 29,000 anime to
   * pick up what one manga page already stated.
   *
   * Every link is checked against the anime's own Source before it is written.
   * MAL's "Adaptation" is symmetric -- the Spice & Wolf manga page lists five
   * anime, all of which adapt the light novel that manga came from, not the
   * manga -- so the page alone cannot distinguish a real adaptation from a
   * sibling. The anime's Source can, and an anime whose Source contradicts this
   * work is skipped rather than guessed at.
   */
  private async linkAdaptedAnime(
    page: any,
    workId: string,
    workType: string | null,
  ): Promise<void> {
    try {
      const entries: AdaptationEntry[] = await page.evaluate(readAdaptations)
      const candidates: AdaptationEntry[] = pickAnimeAdaptations(entries)

      for (const candidate of candidates) {
        const link: string = candidate.href.split('?')[0]
        const resolved = await this.myanimelistlinkRepo.resolveByLink(link)
        if (!resolved || !resolved.recordId) {
          // The anime is not in the catalogue yet. Nothing to record here: the
          // anime scrape stores its own link when it gets there, and resolves
          // this relation from its side.
          continue
        }

        const source: string = await this.animeService.getSource(resolved.recordId)
        if (!sourceMatchesWorkType(source, workType)) {
          this.logger.debug(
            `Skipping ${link}: source ${source || 'unknown'} does not match work type ${workType}`,
          )
          continue
        }

        await this.animeService.setSourceWork(resolved.recordId, workId)
        this.logger.debug(`Linked anime ${resolved.recordId} to work ${workId}`)
      }
    } catch (e) {
      // Losing the back-link is not a reason to lose the work that was scraped.
      this.logger.warn(`Could not link adapted anime for work ${workId}: ${e.message}`)
    }
  }

  public async scrapeCharactersAndStaff({ page, data }: any) {
    // When called from queue, data is the entire queued object
    // When called directly, data has url and id properties
    const url: string = typeof data === 'string' ? data : (data.url || '');
    const animeId: string = data.id ? data.id.toString() : '';
    
    if (!url || !animeId) {
      this.logger.warn(`Missing url or id for character/staff scraping. Data: ${JSON.stringify(data)}`);
      return;
    }

    try {
      // Check if page is still accessible
      if (page.isClosed()) {
        this.logger.warn(`Page is closed, skipping character/staff scraping for ${url}`);
        return;
      }

      await page.setDefaultNavigationTimeout(5 * 60 * 1000);
      const pageLoaded = await this.gotoWithTimeout(page, `${url}/characters`);
      if (!pageLoaded) {
        this.logger.warn(`Continuing with partial page load for characters: ${url}/characters`);
      }
      await this.handleCaptchas(page);
    } catch (sessionError) {
      this.logger.warn(`Session error accessing ${url}/characters: ${sessionError.message}`);
      return;
    }

    // Extract all data from the page in a single evaluation to avoid session errors
    let pageData: Array<{
      characterName: string | null;
      role: string | null;
      image: string | null;
      characterLink: string | null;
      voiceActors: Array<{
        name: string | null;
        language: string | null;
        link: string | null;
        image: string | null;
      }>;
    }>;
    try {
      pageData = await page.evaluate(() => {
        const tables = document.querySelectorAll('.anime-character-container.js-anime-character-container table.js-anime-character-table');
        const extractedData: Array<{
          characterName: string | null;
          role: string | null;
          image: string | null;
          characterLink: string | null;
          voiceActors: Array<{
            name: string | null;
            language: string | null;
            link: string | null;
            image: string | null;
          }>;
        }> = [];

        for (const table of tables) {
          const characterNameEl = table.querySelector('h3.h3_character_name');
          const roleEl = table.querySelector('.spaceit_pad:nth-of-type(4)');
          const imageEl = table.querySelector('td:nth-child(1) img') as HTMLImageElement | null;
          const characterLinkEl = table.querySelector('.spaceit_pad:nth-of-type(3) a') as HTMLAnchorElement | null;

          const voiceActorRows = table.querySelectorAll('.js-anime-character-va-lang');
          const voiceActors: Array<{
            name: string | null;
            language: string | null;
            link: string | null;
            image: string | null;
          }> = [];

          for (const row of voiceActorRows) {
            const nameEl = row.querySelector('.spaceit_pad a');
            const languageEl = row.querySelector('.spaceit_pad:nth-of-type(2)');
            const linkEl = row.querySelector('.spaceit_pad a') as HTMLAnchorElement | null;
            const imageEl = row.querySelector('img') as HTMLImageElement | null;

            voiceActors.push({
              name: nameEl?.textContent?.trim() || null,
              language: languageEl?.textContent?.trim() || null,
              link: linkEl?.href || null,
              image: imageEl?.getAttribute('data-src') || null
            });
          }

          extractedData.push({
            characterName: characterNameEl?.textContent?.trim() || null,
            role: roleEl?.textContent?.trim() || null,
            image: imageEl?.getAttribute('data-src') || null,
            characterLink: characterLinkEl?.href || null,
            voiceActors
          });
        }

        return extractedData;
      });
    } catch (evalError) {
      this.logger.warn(`Failed to extract character/staff data from ${url}: ${evalError.message}`);
      return;
    }

    if (!pageData || pageData.length === 0) {
      this.logger.debug(`No character/staff data found for ${url}`);
      return;
    }

    let characterLinks: { url: string, name: string }[] = [];
    let staffLinks: { url: string, givenName: string, familyName: string }[] = [];

    // Process the extracted data
    for (const tableData of pageData) {
      try {
        const characterName = tableData.characterName || 'Unknown';
        const role = tableData.role || 'Unknown';
        const image = tableData.image;
        const characterLink = tableData.characterLink;

        if (characterLink) {
          characterLinks.push({ url: characterLink, name: characterName });
        }

        const character = new AnimeCharacterEntity();
        character.animeID = animeId;
        character.name = characterName;
        character.image = image || null;
        character.role = role;

        const upsertedCharacter = await this.animeService.upsertAnimeCharacter(animeId, character);
        this.logger.debug(`Upserted character: ${upsertedCharacter.name} with ID: ${upsertedCharacter.id}`);

        // Process voice actors from the extracted data
        for (const voiceActorData of tableData.voiceActors) {
          const voiceActorName = voiceActorData.name || 'Unknown Unknown';
          const voiceActorLanguage = voiceActorData.language;
          const voiceActorLink = voiceActorData.link;
          const voiceActorImage = voiceActorData.image;

          const [familyName, givenName] = voiceActorName
            .split(',')
            .map((part: string) => part.trim());

          // Ensure names are not empty or undefined for database constraints
          const safeFamilyName = familyName || 'Unknown';
          const safeGivenName = givenName || 'Unknown';

          if (voiceActorLink) {
            staffLinks.push({ url: voiceActorLink, givenName: safeGivenName, familyName: safeFamilyName });
          }

          const staff = new AnimeStaffEntity();
          staff.given_name = safeGivenName;
          staff.family_name = safeFamilyName;
          staff.image = voiceActorImage || null;
          staff.language = voiceActorLanguage || null;

          const upsertedStaff = await this.animeService.upsertAnimeStaff(staff);
          this.logger.debug(`Upserted voice actor: ${upsertedStaff.given_name} ${upsertedStaff.family_name}`);

          await this.animeService.linkCharacterToStaff(
            upsertedCharacter.id,
            upsertedStaff.id,
            character.name,
            safeGivenName,
            safeFamilyName
          );
        }

      } catch (err) {
        this.logger.warn('Error scraping character/staff block', err);
      }
    }

    // Only queue additional scraping if we have links
    if (characterLinks.length > 0) {
      this.logger.debug(`Queuing ${characterLinks.length} character detail scraping tasks`);
      for (const characterLink of characterLinks) {
        try {
          await this.puppeteerService.clusterManager.queue({
            url: characterLink.url,
            animeId,
            characterName: characterLink.name,
          }, async ({ page, data }) => {
            try {
              if (!page.isClosed()) {
                await this.scrapeCharacterDetails({ page, data });
              }
            } catch (err) {
              this.logger.warn(`Error scraping character details for ${data.url}: ${err.message}`);
            }
          });
        } catch (queueError) {
          this.logger.warn(`Failed to queue character detail scraping for ${characterLink.url}: ${queueError.message}`);
        }
      }
    }

    if (staffLinks.length > 0) {
      this.logger.debug(`Queuing ${staffLinks.length} voice actor detail scraping tasks`);
      for (const staffLink of staffLinks) {
        try {
          await this.puppeteerService.clusterManager.queue({
            url: staffLink.url,
            givenName: staffLink.givenName,
            familyName: staffLink.familyName,
          }, async ({ page, data }) => {
            try {
              if (!page.isClosed()) {
                await this.scrapeVoiceActorDetails({ page, data });
              }
            } catch (err) {
              this.logger.warn(`Error scraping voice actor details for ${data.url}: ${err.message}`);
            }
          });
        } catch (queueError) {
          this.logger.warn(`Failed to queue voice actor detail scraping for ${staffLink.url}: ${queueError.message}`);
        }
      }
    }
  }


  public async scrapeCharacterDetails({ page, data }: any) {
    const url: string = data.url;
    const animeId: string = data.animeId.toString();
    const characterName: string = data.characterName;

    await page.setDefaultNavigationTimeout(5 * 60 * 1000);
    const pageLoaded = await this.gotoWithTimeout(page, url);
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for character: ${url}`);
    }
    await this.handleCaptchas(page);

    try {
      // Extract English and Japanese names with multiple selector fallbacks
      let fullName = '';
      let nameEn = characterName; // Fallback to original character name
      let nameJp = null;

      try {
        // Try different possible selectors for the character name
        fullName = await ClusterManager.pageFindOne(page, 'h2.normal_header', 'textContent') ||
                  await ClusterManager.pageFindOne(page, 'h1.title-name', 'textContent') ||
                  await ClusterManager.pageFindOne(page, '.h1_bold_none', 'textContent') ||
                  characterName;

        if (fullName && fullName !== characterName) {
          const [name, jpAliasRaw] = fullName.split('(');
          nameEn = name.trim();
          nameJp = jpAliasRaw?.replace(/[()]/g, '').trim() || null;
        }
      } catch (nameError) {
        this.logger.warn(`Could not extract character name from ${url}, using fallback: ${characterName}`);
      }

      // Extract summary with error handling
      let summary = null;
      try {
        summary = await page.evaluate(() => {
          const header = document.querySelector('h2.normal_header') ||
                        document.querySelector('h1.title-name') ||
                        document.querySelector('.h1_bold_none');
          if (!header) return null;

          let node = header.nextSibling;
          while (node && node.nodeType !== 3) node = node.nextSibling; // find text node
          const text = node?.textContent?.trim() || '';
          return text.startsWith('No biography') ? null : text;
        });
      } catch (summaryError) {
        this.logger.debug(`Could not extract character summary from ${url}`);
      }

      const character = new AnimeCharacterEntity();
      character.animeID = animeId;
      character.name = characterName; // Use original name for consistency
      character.title = nameJp;
      character.role = "Main"; // fallback; real role might be per-anime not available here
      character.summary = summary;

      // These fields aren't available from the character detail page directly
      character.birthday = null;
      character.zodiac = null;
      character.gender = null;
      character.race = null;
      character.height = null;
      character.weight = null;
      character.martial_status = null;

      const upsertedCharacter = await this.animeService.upsertAnimeCharacter(animeId, character);
      this.logger.debug(`Upserted character profile: ${upsertedCharacter.name} with ID: ${upsertedCharacter.id}`);

    } catch (error) {
      this.logger.error(`Error scraping character details for ${url}: ${error.message}`);
      // Still try to save basic character info
      const character = new AnimeCharacterEntity();
      character.animeID = animeId;
      character.name = characterName;
      character.title = null;
      character.role = "Unknown";
      character.summary = null;
      character.birthday = null;
      character.zodiac = null;
      character.gender = null;
      character.race = null;
      character.height = null;
      character.weight = null;
      character.martial_status = null;

      await this.animeService.upsertAnimeCharacter(animeId, character);
      this.logger.debug(`Saved basic character info: ${characterName}`);
    }
  }

  public async scrapeVoiceActorDetails({ page, data }: any) {
    const url: string = data.url;
    const givenName = data.givenName;
    const familyName = data.familyName;

    await page.setDefaultNavigationTimeout(5 * 60 * 1000);
    const pageLoaded = await this.gotoWithTimeout(page, url);
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for voice actor: ${url}`);
    }
    await this.handleCaptchas(page);

    const jpGivenName = await ClusterManager.pageFindOne(
      page,
      'div.spaceit_pad:has(span.dark_text:contains("Given name"))',
      'textContent'
    ).then(text => text?.replace('Given name:', '').trim())
      .catch(() => null);

    const jpFamilyName = await ClusterManager.pageFindOne(
      page,
      'div.spaceit_pad:has(span.dark_text:contains("Family name"))',
      'textContent'
    ).then(text => text?.replace('Family name:', '').trim())
      .catch(() => null);

    // :contains() is a jQuery selector, not CSS -- querySelector throws
    // SyntaxError on it, the .catch below swallowed that, and every one of the
    // 22,071 staff rows ended up with a null birthday. MAL puts it in a plain
    // div.spaceit_pad as "Birthday: Feb 25, 1989", so read them and pick.
    const birthday = await page.$$eval('div.spaceit_pad', (els: Element[]) => {
      for (const el of els) {
        const text = (el.textContent || '').trim();
        if (text.startsWith('Birthday:')) {
          // MAL renders these with irregular internal spacing ("Feb  25, 1989").
          return text.replace('Birthday:', '').replace(/\s+/g, ' ').trim();
        }
      }
      return null;
    }).catch(() => null);

    // MAL uses at least three labels for this across people pages -- "Hometown",
    // "Birthplace" and "Birth place". Matching only the last is why it was
    // populated for 786 of 22,071 staff.
    const birthPlace = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerHTML'
    ).then(html => {
      const match = html.match(/(?:Birth\s?place|Hometown):\s*(.+?)<br>/i);
      return match ? match[1].trim() : null;
    }).catch(() => null);

    const bloodType = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerHTML'
    ).then(html => {
      const match = html.match(/Blood type:\s*(.+?)<br>/);
      return match ? match[1].trim() : null;
    }).catch(() => null);

    const hobbies = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerHTML'
    ).then(html => {
      const match = html.match(/Hobbies:\s*(.+?)<br>/);
      return match ? match[1].trim() : null;
    }).catch(() => null);

    // The biography sits in the same block as the key/value facts, after them.
    // This used to drop three hardcoded labels and keep the rest, which failed
    // twice over: 'innerText' was unsupported by pageFindOne so the input was
    // always null, and the real labels vary (Hometown, Height, Member
    // Favorites, ...) so hardcoding three of them would have leaked the others
    // into the biography anyway.
    //
    // Drop every leading "Label: value" line instead, and keep from the first
    // line of prose onwards.
    const summary = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerText'
    ).then((text: string | null) => {
      if (!text) return null;
      const lines = text.split('\n');
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        // A fact line, or the blank line separating the facts from the prose.
        if (line === '' || /^[A-Z][A-Za-z ]{0,24}:\s/.test(line)) {
          i++;
          continue;
        }
        break;
      }
      const body = lines.slice(i).join('\n').trim();
      return body || null;
    }).catch(() => null);

    const image = await ClusterManager.pageFindOne(
      page,
      'td.borderClass img',
      'data-src'
    ).catch(async () =>
      await ClusterManager.pageFindOne(page, 'td.borderClass img', 'src')
    );

    const staff = new AnimeStaffEntity();
    staff.given_name = givenName || '';
    staff.family_name = familyName || '';
    staff.image = image || null;
    staff.birthday = birthday || null;
    staff.birth_place = birthPlace || null;
    staff.blood_type = bloodType || null;
    staff.hobbies = hobbies || null;
    staff.summary = summary || null;

    const upserted = await this.animeService.upsertAnimeStaff( staff);
    this.logger.debug(`Upserted voice actor: ${upserted.given_name} ${upserted.family_name}`);
  }





  public async scrapeEpisode({ page, data }: any): Promise<void> {
    this.logger.debug(`Collecting anime on page ${data}`)
    const url: string = data.url
    const id: number = data.id
    /*await page.setRequestInterception(true)
        page.on('request', (request: any): void => {
          if (request.resourceType() === 'script') request.abort()
          else {
            request.continue()
          }
        })*/
    await page.setDefaultNavigationTimeout(60 * 2000)
    const pageLoaded = await this.gotoWithTimeout(page, `${url}/episode`);
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for episodes: ${url}/episode`);
    }
    await this.handleCaptchas(page)

    // // get all links
    // const links: ElementHandle[] = await ClusterManager.findMany(page, 'a')
    //
    // // select link with textContent 'Episodes'
    // const episodesLink = links.find((link: ElementHandle) => {
    //   return page
    //     .evaluate((el: any) => el.textContent, link)
    //     .includes('Episodes')
    // })
    //
    // if (!episodesLink) {
    //   throw new Error('No episodes link found')
    // }
    //
    // // click episodes link
    // await episodesLink.click()
    // await page.waitForNavigation()

    // check if .pagination exists
    const paginationExists = await ClusterManager.wait(
      page,
      '.pagination',
      1000,
    )
    const episodes = []
    this.logger.debug(`pagenation exists?: ${paginationExists}`)

    const elements: ElementHandle[] = await ClusterManager.findMany(
      page,
      '.episode-list-data',
    )

    // @ts-ignore
    const res: any = await elements.reduce(async (acc, element) => {
      const title = await ClusterManager.findOneGivenElement(
        page,
        element,
        '.episode-title a',
        'textContent',
      )
      let JPTitle
      try {
        JPTitle = await ClusterManager.findOneGivenElement(
          page,
          element,
          '.episode-title span:last-child',
          'textContent',
        )
      } catch (e) {
        JPTitle = null
      }
      const episodeNumber = await ClusterManager.findOneGivenElement(
        page,
        element,

        '.episode-number',
        'textContent',
      )
      const aired = await ClusterManager.findOneGivenElement(
        page,
        element,
        '.episode-aired',
        'textContent',
      )

      const synopsisCandidates = await ClusterManager.findMany(page, 'h2')
      const synopsisTitle = synopsisCandidates.find(
        async (el: ElementHandle) => {
          return (
            await page.evaluate((el: any) => el.textContent, el)
          ).includes('Synopsis')
        },
      )
      // get next sibling of synopsisTitle
      const synopsis = await page.evaluate(
        (el: any) => el.nextElementSibling.textContent,
        synopsisTitle,
      )

      return {
        ...(await acc),
        [episodeNumber || 0]: {
          title: title,
          title_jp: JPTitle,
          episodeNumber: episodeNumber || 0,
          aired: parse(aired, 'MMM d, yyyy', new Date()),
          synopsis: synopsis,
        },
      }
    }, {})

    const episodeData = episodes
    for (const key in res) {
      if (res[key]) {
        const element = res[key]

        episodeData.push({
          ...element,
        })
      }
    }

    // for each episode save to database
    await Promise.all(
      episodeData.map(async (episode: any) => {
        if (!episode) {
          return
        }
        // remove extra spaces and new lines
        const parsedData = {
          title: episode.title.replace(/\s\s+/g, ' ').trim(),
          title_jp: episode.title_jp?.replace(/\s\s+/g, ' ').trim(),
          episodeNumber: episode.episodeNumber,
          aired: episode.aired,
          synopsis: episode.synopsis,
          animeId: id.toString(),
        }
        const episodeEntity = new AnimeEpisodesEntity()
        episodeEntity.title_en = parsedData.title
        episodeEntity.title_jp = parsedData.title_jp
        episodeEntity.episode = parsedData.episodeNumber
        // Oct 20, 1999
        episodeEntity.aired = isValid(parsedData.aired)
          ? parsedData.aired
          : null
        episodeEntity.synopsis = parsedData.synopsis
        episodeEntity.anime_id = parsedData.animeId

        return this.animeService.upsertAnimeEpisode(
          id.toString(),
          episodeEntity,
        )
      }),
    )

    if (paginationExists) {
      // get pagination links
      const paginationLinks: ElementHandle[] = await ClusterManager.findMany(
        page,
        '.pagination .link',
      )
      // get link after active link based on class 'current'
      const currentLink = (
        await ClusterManager.findMany(page, '.pagination .link.current')
      )[0]
      console.log(currentLink)
      // get next sibling of currentLink
      const nextLink = await page.evaluateHandle(
        (el: any) => el.nextElementSibling,
        currentLink,
      )

      if (nextLink) {
        // get href of nextLink
        const nextLinkHref = await page.evaluate((el: any) => el.href, nextLink)

        await this.scrapeEpisode({
          page,
          data: { ...data, url: nextLinkHref },
        })
      }
    }
  }
}
