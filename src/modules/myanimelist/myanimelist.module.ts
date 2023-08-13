import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { AnimeModule } from '../anime/anime.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { ScrapeRecordModule } from '../scrape_record/scrape_record.module'
import { MyanimelistService } from './myanimelist.service'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([MyanimelistlinkRepository]),
    PuppeteerModule,
    AnimeModule,
    WinstonModule.forRoot(
      ((name: string) => ({
        // options
        transports: [
          new transports.File({
            filename: 'error.log',
            level: 'error',
          }),
          new transports.Console({
            level: 'warn',
            format: format.combine(alignColorsAndTime(name, 'yellow')),
          }),
          new transports.Console({
            level: 'info',
            format: format.combine(alignColorsAndTime(name, 'blue')),
          }),
          new transports.Console({
            level: 'error',
            format: format.combine(alignColorsAndTime(name, 'red')),
          }),
          new transports.Console({
            level: 'debug',
            format: format.combine(alignColorsAndTime(name, 'magenta')),
          }),
        ],
      }))(MyanimelistModule.name),
    ),
    ScrapeRecordModule,
  ],
  providers: [MyanimelistService],
  exports: [MyanimelistService],
})
export class MyanimelistModule {}
