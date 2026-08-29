import { EntityRepository, Repository } from 'typeorm'
import * as _ from 'lodash'
import { cleanScrapedList } from '../../common/scrapedList'
import { IWork, WORK_TYPE } from './interface'
import { Work } from './work.entity'

@EntityRepository(Work)
export class WorkRepository extends Repository<Work> {
  private toInterface(work: Work): IWork {
    return work
      ? {
          id: work.id,
          malId: work.malId,
          type: work.type,
          urlSlug: work.urlSlug,
          titleEn: work.titleEn,
          titleJp: work.titleJp,
          titleSynonyms: work.titleSynonyms,
          synopsis: work.synopsis,
          imageUrl: work.imageUrl,
          status: work.status,
          volumes: work.volumes,
          chapters: work.chapters,
          publishedFrom: work.publishedFrom,
          publishedTo: work.publishedTo,
          demographic: work.demographic,
          serialization: work.serialization,
          authors: work.authors,
          score: work.score,
          ranking: work.ranking,
          members: work.members,
          favorites: work.favorites,
          createdAt: work.createdAt,
          updatedAt: work.updatedAt,
        }
      : null
  }

  public async findOneById(id: string): Promise<IWork> {
    return this.toInterface(await this.findOne({ where: { id } }))
  }

  public async findOneByMalId(malId: number): Promise<IWork> {
    return this.toInterface(await this.findOne({ where: { malId } }))
  }

  public async findAllByType(type: WORK_TYPE): Promise<IWork[]> {
    const works: Work[] = await this.find({ where: { type } })

    return works.map((work: Work) => this.toInterface(work))
  }

  // Keyed on mal_id, not on the title.
  //
  // MAL rewrites titles freely -- the same URL has been listed as "Kikou Ryouhei
  // Merowlink", "Kikou Ryouhei Mellowlink" and "Armor Hunter Mellowlink" -- and
  // keying myanimelist_link on the title is what left 486 duplicate rows there.
  // The id is the thing that does not change.
  public async upsert(body: Partial<Work>): Promise<IWork> {
    const nullFields: readonly string[] = Object.keys(body).reduce(
      (empty: readonly string[], key: string) =>
        body[key] === null || body[key] === undefined ? empty.concat(key) : empty,
      [],
    )
    const cleanBody: Work = _.omit(body, nullFields) as Work

    // Clean on the way in rather than on the way out, so the placeholder rows
    // that fill anime.studios never reach the column in the first place.
    if (cleanBody.authors) {
      cleanBody.authors = cleanScrapedList(cleanBody.authors)
    }
    if (cleanBody.titleSynonyms) {
      cleanBody.titleSynonyms = cleanScrapedList(cleanBody.titleSynonyms)
    }

    const existing: Work = cleanBody.malId
      ? await this.findOne({ where: { malId: cleanBody.malId } })
      : null

    if (existing) {
      await this.update({ id: existing.id }, cleanBody)

      return this.toInterface({ ...existing, ...cleanBody })
    }

    const saved: Work = await this.save(this.create(cleanBody))

    return this.toInterface(saved)
  }
}
