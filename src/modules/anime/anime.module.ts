import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnimeService } from './anime.service'
import { AnimeRepository } from './repository/anime.repository'
import { AnimeCharacterRepository } from './repository/animeCharacters.repository'
import { AnimeEpisodesRepository } from './repository/animeEpisodes.repository'
import { AnimeStaffRepository } from './repository/animeStaff.repository'
import { AnimeCharacterStaffLinkEntity } from './repository/animeCharacterStaffLink.entity'
import { AnimeCharacterStaffLinkRepository } from './repository/animeCharacterStaffLink.repository'
import { AnimeSeasonRepository } from './repository/anime-season.repository'
import { MyanimelistlinkRepository } from '../myanimelist/repository/myanimelist.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnimeRepository,
      AnimeEpisodesRepository,
      AnimeCharacterRepository,
      AnimeStaffRepository,
      AnimeCharacterStaffLinkRepository,
      AnimeSeasonRepository,
      MyanimelistlinkRepository,
    ]),
  ],
  providers: [AnimeService],
  exports: [AnimeService],
})
export class AnimeModule {}
