import { EntityRepository, Repository } from 'typeorm'
import * as _ from 'lodash'
import { isValid } from 'date-fns'
import { IAnime } from './interface'
import { Anime } from './anime.entity'

@EntityRepository(Anime)
export class AnimeRepository extends Repository<Anime> {
  public async findOneById(id: number): Promise<IAnime> {
    const item: Anime = await this.findOne({
      where: { id },
    })

    return item
      ? {
          id: item.id,
          anidbid: item.anidbid,
          type: item.type,
          title_en: item.title_en,
          title_jp: item.title_jp,
          title_romaji: item.title_romaji,
          title_kanji: item.title_kanji,
          title_synonyms: item.title_synonyms,
          image_url: item.image_url,
          synopsis: item.synopsis,
          episodes: item.episodes,
          status: item.status,
          startDate: isValid(item.startDate) ? item.startDate : null,
          endDate: isValid(item.endDate) ? item.endDate : null,
          genres: item.genres,
          duration: item.duration,
          broadcast: item.broadcast,
          source: item.source,
          licensors: item.licensors,
          studios: item.studios,
          rating: item.rating,
          ranking: item.ranking,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      : null
  }

  async findOneByTitle(title: string, lang: string): Promise<IAnime> {
    const item: Anime = await this.findOne({
      where: { [`${title}_${lang}`]: title },
    })

    return item
      ? {
          id: item.id,
          anidbid: item.anidbid,
          type: item.type,
          title_en: item.title_en,
          title_jp: item.title_jp,
          title_romaji: item.title_romaji,
          title_kanji: item.title_kanji,
          title_synonyms: item.title_synonyms,
          image_url: item.image_url,
          synopsis: item.synopsis,
          episodes: item.episodes,
          status: item.status,
          startDate: isValid(item.startDate) ? item.startDate : null,
          endDate: isValid(item.endDate) ? item.endDate : null,
          genres: item.genres,
          duration: item.duration,
          broadcast: item.broadcast,
          source: item.source,
          licensors: item.licensors,
          studios: item.studios,
          rating: item.rating,
          ranking: item.ranking,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      : null
  }

  async findOneByTitleEN(title_en: string): Promise<IAnime> {
    const item: Anime = await this.findOne({ where: { title_en } })

    return item
      ? {
          id: item.id,
          anidbid: item.anidbid,
          type: item.type,
          title_en: item.title_en,
          title_jp: item.title_jp,
          title_romaji: item.title_romaji,
          title_kanji: item.title_kanji,
          title_synonyms: item.title_synonyms,
          image_url: item.image_url,
          synopsis: item.synopsis,
          episodes: item.episodes,
          status: item.status,
          startDate: isValid(item.startDate) ? item.startDate : null,
          endDate: isValid(item.endDate) ? item.endDate : null,
          genres: item.genres,
          duration: item.duration,
          broadcast: item.broadcast,
          source: item.source,
          licensors: item.licensors,
          studios: item.studios,
          rating: item.rating,
          ranking: item.ranking,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      : null
  }

  public async upsert(body: Partial<Anime>): Promise<IAnime> {
    // eslint-disable-next-line
    let nullFields: readonly string[] = Object.keys(body).reduce(
      (empty: readonly string[], key: string) =>
        !body[key] ? empty.concat(key) : empty,
      [],
    )
    // eslint-disable-next-line
    let cleanBody: Anime = _.omit(body, nullFields) as Anime
    // eslint-disable-next-line
    let savedLink: Anime = await this.findOne({
      title_en: cleanBody.title_en,
      title_jp: cleanBody.title_jp,
    })
    if (savedLink) {
      await this.update({ id: savedLink.id }, cleanBody)
      const link = { ...savedLink, ...cleanBody }
      return {
        id: link.id,
        anidbid: link.anidbid,
        type: link.type,
        title_en: link.title_en,
        title_jp: link.title_jp,
        title_romaji: link.title_romaji,
        title_kanji: link.title_kanji,
        title_synonyms: link.title_synonyms,
        image_url: link.image_url,
        synopsis: link.synopsis,
        episodes: link.episodes,
        status: link.status,
        startDate: isValid(link.startDate) ? link.startDate : null,
        endDate: isValid(link.endDate) ? link.endDate : null,
        genres: link.genres,
        duration: link.duration,
        broadcast: link.broadcast,
        source: link.source,
        licensors: link.licensors,
        studios: link.studios,
        rating: link.rating,
        ranking: link.ranking,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }
    }

    // eslint-disable-next-line
    let newUserData: Anime = this.create(cleanBody)
    const saved: Anime = await this.save(newUserData)
    newUserData = null
    cleanBody = null
    nullFields = null
    savedLink = null
    return {
      id: saved.id,
      anidbid: saved.anidbid,
      type: saved.type,
      title_en: saved.title_en,
      title_jp: saved.title_jp,
      title_romaji: saved.title_romaji,
      title_kanji: saved.title_kanji,
      title_synonyms: saved.title_synonyms,
      image_url: saved.image_url,
      synopsis: saved.synopsis,
      episodes: saved.episodes,
      status: saved.status,
      startDate: isValid(saved.startDate) ? saved.startDate : null,
      endDate: isValid(saved.endDate) ? saved.endDate : null,
      genres: saved.genres,
      duration: saved.duration,
      broadcast: saved.broadcast,
      source: saved.source,
      licensors: saved.licensors,
      studios: saved.studios,
      rating: saved.rating,
      ranking: saved.ranking,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    }
  }
}
