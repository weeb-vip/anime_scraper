import { Between, EntityRepository, Repository } from 'typeorm'
import * as _ from 'lodash'
import { IMyanimelist, RECORD_TYPE } from './interface'
import { MyanimelistLinks } from './myanimelist.entity'

@EntityRepository(MyanimelistLinks)
export class MyanimelistlinkRepository extends Repository<MyanimelistLinks> {
  // The projection was written out at every return site, which is how a column
  // gets added to the entity and silently missed by half the reads.
  private toInterface(link: MyanimelistLinks): IMyanimelist {
    return link
      ? {
          id: link.id,
          name: link.name,
          type: link.type,
          link: link.link,
          animeId: link.animeId,
          recordId: link.recordId ?? link.animeId,
          updatedAt: link.updatedAt,
        }
      : null
  }

  public async findOneById(id: number): Promise<IMyanimelist> {
    return this.toInterface(await this.findOne({ where: { id } }))
  }

  async findOneByName(name: string): Promise<IMyanimelist> {
    return this.toInterface(await this.findOne({ where: { name } }))
  }

  // "Given this MAL URL, what is our id" -- the question the scraper asks for
  // every related entry on every page it parses. The link is unique, so this is
  // a single index lookup and the answer carries its own type: a link to a manga
  // resolves to a work id, one to an anime resolves to an anime id.
  //
  // Returns null when the URL has never been seen, which is not an error. It is
  // the normal case for a relation to something not scraped yet, and the reason
  // the link is stored unresolved rather than dropped.
  async resolveByLink(
    link: string,
  ): Promise<{ type: RECORD_TYPE; recordId: string } | null> {
    const found: MyanimelistLinks = await this.findOne({ where: { link } })
    if (!found) {
      return null
    }

    const recordId: string = found.recordId ?? found.animeId
    return recordId ? { type: found.type, recordId } : null
  }

  // Every link of one kind. getAllAnime is this with the type fixed.
  async findAllByType(type: RECORD_TYPE): Promise<IMyanimelist[]> {
    const links: MyanimelistLinks[] = await this.find({ where: { type } })

    return links.map((link: MyanimelistLinks) => this.toInterface(link))
  }

  public async upsert(body: Partial<MyanimelistLinks>): Promise<IMyanimelist> {
    // eslint-disable-next-line
    let nullFields: readonly string[] = Object.keys(body).reduce(
      (empty: readonly string[], key: string) =>
        !body[key] ? empty.concat(key) : empty,
      [],
    )
    // eslint-disable-next-line
    let cleanBody: MyanimelistLinks = _.omit(
      body,
      nullFields,
    ) as MyanimelistLinks

    // Callers that only know about anime still pass animeId. Mirror it so
    // record_id is populated from now on and the backfill does not have to be
    // repeated when anime_id is finally dropped.
    if (cleanBody.animeId && !cleanBody.recordId) {
      cleanBody.recordId = cleanBody.animeId
    }

    // Match on the link first.
    //
    // This matched on name+type first and fell back to the link, which made a
    // retitled entry a new row rather than an update: MAL lists the same URL as
    // "Kikou Ryouhei Merowlink", "Kikou Ryouhei Mellowlink" and "Armor Hunter
    // Mellowlink", and production ended up with all three. 485 links were
    // duplicated that way across 971 rows, and 399 of those rows never resolved
    // to an anime.
    //
    // The link is the identity here -- one MAL URL is one record, which is what
    // the unique index added alongside this asserts. The name is a label on it
    // and changes freely.
    // eslint-disable-next-line
    let savedLink: MyanimelistLinks = await this.findOne({
      where: { link: cleanBody.link },
    })
    if (!savedLink) {
      savedLink = await this.findOne({
        where: { name: cleanBody.name, type: cleanBody.type },
      })
    }

    if (savedLink) {
      await this.update({ id: savedLink.id }, cleanBody)

      return this.toInterface({ ...savedLink, ...cleanBody })
    }

    // eslint-disable-next-line
    let newUserData: MyanimelistLinks = this.create(cleanBody)
    const saved: MyanimelistLinks = await this.save(newUserData)
    newUserData = null
    cleanBody = null
    nullFields = null
    savedLink = null

    return this.toInterface(saved)
  }

  async getAllAnime(): Promise<IMyanimelist[]> {
    return this.findAllByType(RECORD_TYPE.Anime)
  }

  /**
   * The MAL URL of every anime whose airing window touches `year`.
   *
   * The list a yearly re-scrape runs on. It is built from what the catalogue
   * already holds rather than from MAL's season pages, because those are a
   * discovery surface and not an index: they omit entries entirely, and the
   * collector only reads the first block of each one anyway. Anything we
   * already know about is here no matter how it was found.
   *
   * "Touches the year" rather than "started in it", so a series that began in
   * the previous autumn and is still running counts -- those are exactly the
   * ones a season page files elsewhere. A missing end date only counts while
   * MAL still calls the anime currently airing; without that a row with no end
   * date and no airing status would match every year forever.
   *
   * Links that never resolved to an anime drop out with the join, which is
   * correct for a refresh: there is nothing recorded yet to refresh.
   */
  async getAnimeLinksForYear(year: number): Promise<string[]> {
    const start = `${year}-01-01T00:00:00Z`
    const nextYear = `${year + 1}-01-01T00:00:00Z`

    const rows: { link: string }[] = await this.query(
      `
      SELECT l.link
      FROM myanimelist_link l
      -- anime.id is uuid, the link's columns are varchar, so one side has to
      -- be cast. Casting the uuid to text rather than the text to uuid: a
      -- record_id that is not a well-formed uuid then simply fails to match,
      -- where ::uuid would abort the whole query on the first bad row.
      JOIN anime a ON a.id::text = COALESCE(l.record_id, l.anime_id)
      WHERE l.type = $1
        AND a.start_date IS NOT NULL
        AND a.start_date < $3
        AND (
          a.start_date >= $2
          OR a.end_date >= $2
          OR (a.end_date IS NULL AND a.status = 'Currently Airing')
        )
      ORDER BY a.start_date, l.id
      `,
      [RECORD_TYPE.Anime, start, nextYear],
    )

    return rows.map((row: { link: string }) => row.link)
  }

  async getAllNewAnime(days: number = 1): Promise<IMyanimelist[]> {
    // current date
    const today = new Date()
    if (days < 1) days = 1

    // today minus 1 day
    const yesterday = new Date(
      new Date(today).setDate(today.getDate() - days),
    ).toISOString()

    const links: MyanimelistLinks[] = await this.find({
      where: {
        type: RECORD_TYPE.Anime,
        // created at is between yesterday and today
        createdAt: Between(yesterday, today.toISOString()),
      },
    })

    return links.map((link: MyanimelistLinks) => this.toInterface(link))
  }
}
