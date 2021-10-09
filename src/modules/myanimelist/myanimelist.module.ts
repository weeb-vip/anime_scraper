import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnimeModule } from '../anime/anime.module'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { MyanimelistService } from './myanimelist.service'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([MyanimelistlinkRepository]),
    PuppeteerModule,
    AnimeModule,
  ],
  providers: [MyanimelistService],
  exports: [MyanimelistService],
})
export class MyanimelistModule {}
