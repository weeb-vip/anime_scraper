import { Injectable } from '@nestjs/common'
import { AnimeRepository } from './repository/anime.repository'
import { IAnime } from './repository/interface'
import { AnimeEpisodesRepository } from './repository/animeEpisodes.repository'
import { AnimeCharacterRepository } from './repository/animeCharacters.repository'
import { AnimeEpisodesEntity } from './repository/animeEpisodes.entity'
import { AnimeCharacterEntity } from './repository/animeCharacters.entity'
import { AnimeStaffRepository } from './repository/animeStaff.repository'
import { AnimeStaffEntity } from './repository/animeStaff.entity'
import { AnimeCharacterStaffLinkRepository } from './repository/animeCharacterStaffLink.repository'
import { AnimeCharacterStaffLinkEntity } from './repository/animeCharacterStaffLink.entity'
import { AnimeSeasonRepository } from './repository/anime-season.repository'
import { AnimeSeasonEntity, SeasonStatus } from './repository/anime-season.entity'
import { MyanimelistlinkRepository } from '../myanimelist/repository/myanimelist.repository'
import { RECORD_TYPE } from '../myanimelist/repository/interface'
import { SeasonYear } from '../common/season.types'

@Injectable()
export class AnimeService {
  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeEpisodesRepository: AnimeEpisodesRepository,
    private readonly animeCharacterRepository: AnimeCharacterRepository,
    private readonly animeStaffRepository: AnimeStaffRepository,
    private readonly animeCharacterStaffLinkRepository: AnimeCharacterStaffLinkRepository,
    private readonly animeSeasonRepository: AnimeSeasonRepository,
    private readonly myanimelistlinkRepository: MyanimelistlinkRepository,
  ) {}

  /**
   * @deprecated Use upsertAnimeWithMyAnimeListLink instead to ensure all anime have MyAnimeList links
   */
  upsertAnime(anime: Partial<IAnime>) {
    console.warn('WARNING: upsertAnime should only be used for existing anime with MyAnimeList links. Use upsertAnimeWithMyAnimeListLink for new anime.')
    return this.animeRepository.upsert(anime)
  }

  async upsertAnimeWithMyAnimeListLink(
    animeData: Partial<IAnime>,
    myAnimeListUrl: string,
    animeName: string,
  ): Promise<IAnime> {
    if (!myAnimeListUrl) {
      throw new Error('MyAnimeList URL is required for all anime entries')
    }

    // First check if a MyAnimeList link already exists for this URL
    const existingLink = await this.myanimelistlinkRepository.findOne({
      where: { link: myAnimeListUrl },
    })

    let upsertedAnime: IAnime

    if (existingLink && existingLink.animeId) {
      // If link exists and has an anime ID, update that anime
      upsertedAnime = await this.animeRepository.upsert({
        ...animeData,
        id: existingLink.animeId,
      })
    } else {
      // Create new anime
      upsertedAnime = await this.animeRepository.upsert(animeData)

      // Create or update the MyAnimeList link with the new anime ID
      await this.myanimelistlinkRepository.upsert({
        name: animeName,
        link: myAnimeListUrl,
        type: RECORD_TYPE.Anime,
        animeId: upsertedAnime.id,
      })
    }

    return upsertedAnime
  }

  upsertAnimeEpisode(animeID: string, episode: AnimeEpisodesEntity) {
    return this.animeEpisodesRepository.upsert({
      ...episode,
      anime_id: animeID,
    })
  }

  upsertAnimeCharacter(animeID: string, character: AnimeCharacterEntity) {
    return this.animeCharacterRepository.upsert({
      ...character,
      animeID: animeID,
    })
  }

  upsertAnimeStaff(staff: AnimeStaffEntity) {
    return this.animeStaffRepository.upsert({
      ...staff
    })
  }

  linkCharacterToStaff(
    characterId: string,
    staffId: string,
    characterName: string,
    staffGivenName: string,
    staffFamilyName: string,
  ) {
    return this.animeCharacterStaffLinkRepository.upsert({
      characterID: characterId,
      staffID: staffId,
      characterName,
      staffGivenName,
      staffFamilyName,
    } as AnimeCharacterStaffLinkEntity)
  }


  getDuplicates() {
    return this.animeRepository.getDuplicates()
  }

  deleteAnime(id: number) {
    return this.animeRepository.delete(id)
  }

  deleteAnimeEpisodes(animeId: string) {
    return this.animeEpisodesRepository.deleteByAnimeId(animeId)
  }

  async findOrphanedAnime(): Promise<IAnime[]> {
    // Find anime that don't have corresponding MyAnimeList links
    const query = `
      SELECT a.*
      FROM anime a
      LEFT JOIN myanimelist_links ml ON a.id = ml.anime_id
      WHERE ml.anime_id IS NULL
    `
    
    const orphanedAnime = await this.animeRepository.query(query)
    return orphanedAnime.map(item => ({
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
      startDate: item.startDate,
      endDate: item.endDate,
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
    }))
  }

  async validateAnimeIntegrity(): Promise<{
    totalAnime: number,
    linkedAnime: number,
    orphanedAnime: number,
    orphanedList: IAnime[]
  }> {
    const totalAnime = await this.animeRepository.count()
    const linkedAnimeQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM anime a
      INNER JOIN myanimelist_links ml ON a.id = ml.anime_id
    `
    const linkedResult = await this.animeRepository.query(linkedAnimeQuery)
    const linkedAnime = parseInt(linkedResult[0].count)
    
    const orphanedList = await this.findOrphanedAnime()
    
    return {
      totalAnime,
      linkedAnime,
      orphanedAnime: orphanedList.length,
      orphanedList
    }
  }

  // Season management methods
  async addAnimeSeason(
    animeId: string,
    season: SeasonYear,
    status: SeasonStatus = SeasonStatus.UNKNOWN,
    episodeCount?: number,
    notes?: string
  ): Promise<AnimeSeasonEntity> {
    return this.animeSeasonRepository.upsert({
      anime: { id: animeId } as any,
      season,
      status,
      episode_count: episodeCount,
      notes
    })
  }

  async getAnimeSeasons(animeId: string): Promise<AnimeSeasonEntity[]> {
    return this.animeSeasonRepository.find({
      where: { anime: { id: animeId } },
      order: { season: 'ASC' }
    })
  }

  async getSeasonalAnime(season: SeasonYear, status?: SeasonStatus): Promise<AnimeSeasonEntity[]> {
    const where: any = { season }
    if (status) {
      where.status = status
    }
    
    return this.animeSeasonRepository.find({
      where,
      relations: ['anime'],
      order: { created_at: 'DESC' }
    })
  }

  async getContinuingAnime(): Promise<AnimeSeasonEntity[]> {
    return this.animeSeasonRepository
      .createQueryBuilder('animeSeason')
      .leftJoinAndSelect('animeSeason.anime', 'anime')
      .where('animeSeason.status = :status', { status: SeasonStatus.CONTINUING })
      .orderBy('animeSeason.season', 'DESC')
      .getMany()
  }

  async getMultiSeasonAnime(): Promise<IAnime[]> {
    // Get anime that appear in multiple seasons
    const query = `
      SELECT a.*, array_agg(ans.season) as seasons, array_agg(ans.status) as season_statuses
      FROM anime a
      INNER JOIN anime_seasons ans ON a.id = ans.anime_id
      GROUP BY a.id
      HAVING COUNT(ans.season) > 1
      ORDER BY a.title_en
    `
    
    return this.animeRepository.query(query)
  }

  async updateSeasonStatus(animeId: string, season: SeasonYear, status: SeasonStatus): Promise<void> {
    await this.animeSeasonRepository.update(
      { anime: { id: animeId }, season },
      { status }
    )
  }
}
