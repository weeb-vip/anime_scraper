import { Module } from '@nestjs/common'
import { ConfigModule } from '../config/config.module'
import { PuppeteerService } from './puppeteer.service'
import { PuppeteerConfig } from './puppeteer.config'

@Module({
  imports: [ConfigModule.register(PuppeteerConfig)],
  providers: [PuppeteerService],
  exports: [PuppeteerService],
})
export class PuppeteerModule {}
