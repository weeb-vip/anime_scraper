import { Injectable } from '@nestjs/common'
import { AnimeRepository } from './repository/anime.repository'
import { IAnime } from './repository/interface'

@Injectable()
export class AnimeService {
  constructor(private readonly animeRepository: AnimeRepository) {}

  upsertAnime(anime: Partial<IAnime>) {
    return this.animeRepository.upsert(anime)
  }
}
