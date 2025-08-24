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
    this.logger.debug(`Collecting anime on page ${data}`)
    const url: string = data
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

    // check if there is an anime already linked to the url
    const existingAnime = await this.myanimelistlinkRepo.findOne({
      where: {
        link: url,
      },
    })


    const upsertedAnime = await this.animeService.upsertAnime({
      ...parsedData,
      startDate: parsedStartDate,
      ...(existingAnime?.animeId ? { id: existingAnime?.animeId } : {}),
    })

    // remove query param from link
    const sanitizedURL = url.split('?')[0]
    await this.myanimelistlinkRepo.upsert({
      name: parsedData.title_en,
      link: sanitizedURL,
      type: RECORD_TYPE.Anime,
      animeId: upsertedAnime.id,
    })

    try {
      await this.scrapeCharactersAndStaff({
        page,
        data: {
          url,
          id: upsertedAnime.id,
        },
      })
    } catch (e) {
      this.logger.error(
        `Error scraping characters and staff for ${upsertedAnime.title_en}`,
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
    const url: string = data.url;
    const animeId: string = data.id.toString();

    await page.setDefaultNavigationTimeout(5 * 60 * 1000);
    const pageLoaded = await this.gotoWithTimeout(page, `${url}/characters`);
    if (!pageLoaded) {
      this.logger.warn(`Continuing with partial page load for characters: ${url}/characters`);
    }
    await this.handleCaptchas(page);

    const tables: ElementHandle[] = await ClusterManager.findMany(
      page,
      '.anime-character-container.js-anime-character-container table.js-anime-character-table'
    );

    let characterLinks: { url: string, name: string }[] = [];
    let staffLinks: { url: string, givenName: string, familyName: string }[] = [];

    for (const table of tables) {
      try {
        const characterName = await ClusterManager.findOneGivenElement(
          page, table, 'h3.h3_character_name', 'textContent'
        );

        const role = await ClusterManager.findOneGivenElement(
          page, table, '.spaceit_pad:nth-of-type(4)', 'textContent'
        );

        const image = await ClusterManager.findOneGivenElement(
          page, table, 'td:nth-child(1) img', 'data-src'
        );

        const characterLink = await ClusterManager.findOneGivenElement(
          page, table, '.spaceit_pad:nth-of-type(3) a', 'href'
        );

        if (characterLink) {
          characterLinks.push({ url: characterLink, name: characterName });
        }

        const character = new AnimeCharacterEntity();
        character.animeID = animeId;
        character.name = characterName?.trim() || 'Unknown';
        character.image = image || null;
        character.role = role?.trim() || 'Unknown';

        const upsertedCharacter = await this.animeService.upsertAnimeCharacter(animeId, character);
        this.logger.debug(`Upserted character: ${upsertedCharacter.name} with ID: ${upsertedCharacter.id}`);

        const voiceActorRows = await table.$$('.js-anime-character-va-lang');

        for (const row of voiceActorRows) {
          const voiceActorName = await ClusterManager.findOneGivenElement(page, row, '.spaceit_pad a', 'textContent');
          const voiceActorLanguage = await ClusterManager.findOneGivenElement(page, row, '.spaceit_pad:nth-of-type(2)', 'textContent')
          const voiceActorLink = await ClusterManager.findOneGivenElement(page, row, '.spaceit_pad a', 'href');
          const voiceActorImage = await ClusterManager.findOneGivenElement(page, row, 'img', 'data-src');

          const [familyName, givenName] = (voiceActorName || 'Unknown Unknown')
            .split(',')
            .map((part) => part.trim());

          if (voiceActorLink) {
            staffLinks.push({ url: voiceActorLink, givenName, familyName });
          }

          const languageTrimmed = voiceActorLanguage?.trim() || null

          const staff = new AnimeStaffEntity();
          staff.given_name = givenName || '';
          staff.family_name = familyName || '';
          staff.image = voiceActorImage || null;
          staff.language = languageTrimmed || null

          const upsertedStaff = await this.animeService.upsertAnimeStaff(staff);
          this.logger.debug(`Upserted voice actor: ${upsertedStaff.given_name} ${upsertedStaff.family_name}`);

          await this.animeService.linkCharacterToStaff(
            upsertedCharacter.id,
            upsertedStaff.id,
            character.name,
            givenName,
            familyName
          );
        }

      } catch (err) {
        this.logger.warn('Error scraping character/staff block', err);
      }
    }

    for (const characterLink of characterLinks) {
      await this.puppeteerService.clusterManager.queue({
        url: characterLink.url,
        animeId,
        characterName: characterLink.name,
      }, async ({ page, data }) => {
        await this.scrapeCharacterDetails({ page, data });
      });
    }

    for (const staffLink of staffLinks) {
      await this.puppeteerService.clusterManager.queue({
        url: staffLink.url,
        givenName: staffLink.givenName,
        familyName: staffLink.familyName,
      }, async ({ page, data }) => {
        await this.scrapeVoiceActorDetails({ page, data });
      });
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

    // Extract English and Japanese names
    const fullName = await page.$eval('h2.normal_header', el => el.textContent?.trim() || '');
    const [name, jpAliasRaw] = fullName.split('(');
    const nameEn = name.trim();
    const nameJp = jpAliasRaw?.replace(/[()]/g, '').trim() || null;

    // Extract image


    // Extract summary (may not exist)
    const summary = await page.evaluate(() => {
      const header = document.querySelector('h2.normal_header');
      let node = header?.nextSibling;
      while (node && node.nodeType !== 3) node = node.nextSibling; // find text node
      const text = node?.textContent?.trim() || '';
      return text.startsWith('No biography') ? null : text;
    });

    const character = new AnimeCharacterEntity();
    character.animeID = animeId;
    character.name = characterName;
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
