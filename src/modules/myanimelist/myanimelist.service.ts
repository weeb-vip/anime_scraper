import {Inject, Injectable} from '@nestjs/common'
import * as QueryString from 'query-string'
import {ElementHandle} from 'puppeteer'
import {parse as ParseDate, isValid, parse} from 'date-fns'
import {Logger} from 'winston'
import {PuppeteerService} from '../puppeteer/puppeteer.service'
import ClusterManager from '../puppeteer/clusterManager'
import {AnimeService} from '../anime/anime.service'
import {ScrapeRecordService} from '../scrape_record/scrape_record.service'
import {AnimeEpisodesEntity} from '../anime/repository/animeEpisodes.entity'
import {IAnimeRequest} from './interfaces'
import {MyanimelistlinkRepository} from './repository/myanimelist.repository'
import {RECORD_TYPE} from './repository/interface'

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
    async collectAnime({page, data}: any) {
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
    async collectNewAnime({page, data}: any) {
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
        const {basePath, params} = this.animeRequest
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
            'c%5B0%5D': '&c%5B1%5D=d',
            cv: '2',
            w: '1',
            show: 0,
        }

        const urls = new Array(20).fill(0).map((_, i) => {
            params['show'] += 50
            return `${this.baseURL}${basePath}?${QueryString.stringify(params)}`
        })
        return urls
    }

    // generate anime urls, default for new is false
    async generateAnimeURLs(
        {new: isNew = false}: { new: boolean } = {new: false},
    ): Promise<string[]> {
        if (isNew) {
            return (await this.myanimelistlinkRepo.getAllNewAnime()).map(
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

    async scrapeAnimePage({page, data}: any) {
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
            genres: res['genres'] ? res['genres'].split(',') : null,
            duration: res['duration'],
            broadcast: res['broadcast'],
            licensors: res['licensors'] ? res['licensors'].split(',') : null,
            studios: res['studios'] ? res['studios'].split(',') : null,
            source: res['source'],
            synopsis: res['synopsis'],
            rating: rating ? rating : null,
        }

        const upsertedAnime = await this.animeService.upsertAnime(parsedData)
        try {
            await this.scrapeEpisode({
                page,
                data: {
                    url,
                    id: upsertedAnime.id,
                },
            })
        } catch (e) {
            this.logger.error(
                `Error scraping episodes for ${upsertedAnime.title_en}`,
                e,
            )
        }
        this.scrapeRecordService.recordSuccessfulScrape(data)
    }

    public async scrapeEpisode({page, data}: any): Promise<void> {
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
        await page.goto(`${url}/episode`)
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
        const paginationExists = await ClusterManager.wait(page, '.pagination', 100)
        let episodes = []
        if (paginationExists) {
            // get pagination links
            const paginationLinks: ElementHandle[] = await ClusterManager.findMany(
                page,
                '.pagination a',
            )
            // get link after active link based on class 'current'
            const nextLink = await paginationLinks.find(
                async (link: ElementHandle) => {
                    return (
                        await page.evaluate((el: any) => el.className, link)
                    ).includes('current')
                },
            )
            const index = paginationLinks.indexOf(nextLink)
            if (!(index === paginationLinks.length - 1)) {
                const nextLinkUrl = await page.evaluate(
                    (el: any) => el.href,
                    paginationLinks[index + 1],
                )
                episodes = episodes.concat(
                    await this.scrapeEpisode({
                        page,
                        data: {...data, url: nextLinkUrl},
                    }),
                )
            }
        }

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

            const synopsisCandidates = await ClusterManager.findMany(
                page,
                'h2'
            )
            const synopsisTitle = synopsisCandidates.find(async (el: ElementHandle) => {
                return (await page.evaluate((el: any) => el.textContent, el)).includes('Synopsis')
            })
            // get next sibling of synopsisTitle
            const synopsis = await page.evaluate((el: any) => el.nextElementSibling.textContent, synopsisTitle)


            return {
                ...(await acc),
                [episodeNumber || 0]: {
                    title: title,
                    title_jp: JPTitle,
                    episodeNumber: episodeNumber || 0,
                    aired: aired,
                    synopsis: synopsis
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
                episodeEntity.aired = parse(parsedData.aired, 'MMM d, yyyy', new Date())
                episodeEntity.synopsis = parsedData.synopsis
                episodeEntity.anime_id = parsedData.animeId

                return this.animeService.upsertAnimeEpisode(
                    id.toString(),
                    episodeEntity,
                )
            }),
        )
    }
}
