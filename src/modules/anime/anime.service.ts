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

@Injectable()
export class AnimeService {
  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeEpisodesRepository: AnimeEpisodesRepository,
    private readonly animeCharacterRepository: AnimeCharacterRepository,
    private readonly animeStaffRepository: AnimeStaffRepository,
    private readonly animeCharacterStaffLinkRepository: AnimeCharacterStaffLinkRepository,
  ) {}

  upsertAnime(anime: Partial<IAnime>) {
    return this.animeRepository.upsert(anime)
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
}
