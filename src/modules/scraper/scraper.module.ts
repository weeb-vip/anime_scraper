import { Module } from '@nestjs/common'
import { AnidbModule } from '../anidb/anidb.module'
import { MyanimelistModule } from '../myanimelist/myanimelist.module'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { ScraperService } from './scraper.service'

@Module({
  imports: [PuppeteerModule, AnidbModule, MyanimelistModule],
  controllers: [],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
