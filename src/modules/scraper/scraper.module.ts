import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { AnidbModule } from '../anidb/anidb.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { MyanimelistModule } from '../myanimelist/myanimelist.module'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { ScrapeRecordModule } from '../scrape_record/scrape_record.module'
import { ScraperService } from './scraper.service'

@Module({
  imports: [
    PuppeteerModule,
    AnidbModule,
    MyanimelistModule,
    ScrapeRecordModule,
    WinstonModule.forRoot({
      // options
      transports: [
        new transports.File({
          filename: 'error.log',
          level: 'error',
        }),
        // One console transport, not four.
        //
        // A winston transport emits every level at or below its own, so the
        // previous set -- warn, info, error and debug consoles -- printed an
        // info line twice, a warning three times and an error four times. They
        // existed to colour each level differently; alignColorsAndTime now
        // picks the colour from the level itself, which is the same result
        // from one transport.
        new transports.Console({
          level: 'debug',
          format: format.combine(alignColorsAndTime(ScraperModule.name)),
        }),
      ],
    }),
  ],
  controllers: [],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
