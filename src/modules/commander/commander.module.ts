import { Module } from '@nestjs/common'
import { transports, format } from 'winston'
import { WinstonModule } from 'nest-winston'
import { ScraperModule } from '../scraper/scraper.module'
import { TypeormConnectorModule } from '../postgres-connector/postgres-connector.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { AnimeModule } from '../anime/anime.module'
import { DeduplicateModule } from '../deduplicate/deduplicate.module'
import { ScraperCommand } from './scrape.command'
import { CollectCommand } from './collect.command'
import { NewCommand } from './new.command'

import { DeduplicateCommand } from './deduplicate.command'

@Module({
  imports: [
    ScraperModule,
    TypeormConnectorModule,
    DeduplicateModule,
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
            alignColorsAndTime(ScraperCommandModule.name, 'yellow'),
          ),
        }),
        new transports.Console({
          level: 'info',
          format: format.combine(
            alignColorsAndTime(ScraperCommandModule.name, 'blue'),
          ),
        }),
        new transports.Console({
          level: 'error',
          format: format.combine(
            alignColorsAndTime(ScraperCommandModule.name, 'red'),
          ),
        }),
        new transports.Console({
          level: 'debug',
          format: format.combine(
            alignColorsAndTime(ScraperCommandModule.name, 'magenta'),
          ),
        }),
      ],
    }),
  ],
  controllers: [],
  providers: [NewCommand, ScraperCommand, CollectCommand, DeduplicateCommand],
})
export class ScraperCommandModule {}
