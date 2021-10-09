import { Module } from '@nestjs/common'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { AnidbService } from './anidb.service'

@Module({
  imports: [PuppeteerModule],
  controllers: [],
  providers: [AnidbService],
  exports: [AnidbService],
})
export class AnidbModule {}
