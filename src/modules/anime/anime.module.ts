import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnimeService } from './anime.service'
import { AnimeRepository } from './repository/anime.repository'

@Module({
  imports: [TypeOrmModule.forFeature([AnimeRepository])],
  providers: [AnimeService],
  exports: [AnimeService],
})
export class AnimeModule {}
