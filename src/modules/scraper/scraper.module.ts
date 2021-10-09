import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { AnidbModule } from '../anidb/anidb.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { MyanimelistModule } from '../myanimelist/myanimelist.module'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { ScraperService } from './scraper.service'

@Module({
  imports: [
    PuppeteerModule,
    AnidbModule,
    MyanimelistModule,
    WinstonModule.forRoot({
      // options
      transports: [
        new transports.File({
          filename: 'error.log',
          level: 'error',
        }),
        new transports.Console({
          level: 'info',
          format: format.combine(format.colorize(), format.simple()),
        }),
        new transports.Console({
          level: 'debug',
          format: format.combine(
            alignColorsAndTime(ScraperModule.name, 'magenta'),
          ),
        }),
      ],
    }),
  ],
  controllers: [],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
