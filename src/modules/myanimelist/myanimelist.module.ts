import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { AnimeModule } from '../anime/anime.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { PuppeteerModule } from '../puppeteer/puppeteer.module'
import { MyanimelistService } from './myanimelist.service'
import { MyanimelistlinkRepository } from './repository/myanimelist.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([MyanimelistlinkRepository]),
    PuppeteerModule,
    AnimeModule,
    WinstonModule.forRoot({
      // options
      transports: [
        new transports.File({
          filename: 'error.log',
          level: 'error',
        }),
        new transports.Console({
          level: 'warn',
          format: format.combine(
            alignColorsAndTime(MyanimelistModule.name, 'yellow'),
          ),
        }),
        new transports.Console({
          level: 'info',
          format: format.combine(
            alignColorsAndTime(MyanimelistModule.name, 'blue'),
          ),
        }),
        new transports.Console({
          level: 'error',
          format: format.combine(
            alignColorsAndTime(MyanimelistModule.name, 'red'),
          ),
        }),
        new transports.Console({
          level: 'debug',
          format: format.combine(
            alignColorsAndTime(MyanimelistModule.name, 'magenta'),
          ),
        }),
      ],
    }),
  ],
  providers: [MyanimelistService],
  exports: [MyanimelistService],
})
export class MyanimelistModule {}
