import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnimeService } from './anime.service'
import { AnimeRepository } from './repository/anime.repository'
import { AnimeCharacterRepository } from './repository/animeCharacters.repository'
import { AnimeEpisodesRepository } from './repository/animeEpisodes.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnimeRepository,
      AnimeEpisodesRepository,
      AnimeCharacterRepository,
    ]),
  ],
  providers: [AnimeService],
  exports: [AnimeService],
})
export class AnimeModule {}
