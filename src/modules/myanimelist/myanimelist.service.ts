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
  ) {
  }

  /**
   * Collects anime names from myanimelist
   * @param page
   * @param data
   */
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
          type: RECORD_TYPE.Anime,
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

    // Queue character and staff scraping as a separate task
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

    this.scrapeRecordService.recordSuccessfulScrape(data)
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

    const birthday = await ClusterManager.pageFindOne(
      page,
      'div.spaceit_pad:has(span.dark_text:contains("Birthday"))',
      'textContent'
    ).then(text => text?.replace('Birthday:', '').trim())
      .catch(() => null);

    const birthPlace = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerHTML'
    ).then(html => {
      const match = html.match(/Birth place:\s*(.+?)<br>/);
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

    const summary = await ClusterManager.pageFindOne(
      page,
      'div.people-informantion-more',
      'innerText'
    ).then(text => {
      return text
        .split('\n')
        .filter(line =>
          !line.includes('Birth place:') &&
          !line.includes('Blood type:') &&
          !line.includes('Hobbies:')
        ).join('\n').trim();
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
