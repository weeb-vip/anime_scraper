import { Injectable } from '@nestjs/common'
import { AnimeRepository } from './repository/anime.repository'
import { IAnime } from './repository/interface'
import { AnimeEpisodesRepository } from './repository/animeEpisodes.repository'
import { AnimeCharacterRepository } from './repository/animeCharacters.repository'
import { AnimeEpisodesEntity } from './repository/animeEpisodes.entity'
import { AnimeCharacterEntity } from './repository/animeCharacters.entity'

@Injectable()
export class AnimeService {
  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeEpisodesRepository: AnimeEpisodesRepository,
    private readonly animeCharacterRepository: AnimeCharacterRepository,
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
