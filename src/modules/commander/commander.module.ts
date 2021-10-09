import { Module } from '@nestjs/common'
import { transports, format } from 'winston'
import { WinstonModule } from 'nest-winston'
import { ScraperModule } from '../scraper/scraper.module'
import { TypeormConnectorModule } from '../postgres-connector/postgres-connector.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { ScraperCommand } from './scrape.command'
import { CollectCommand } from './collect.command'

@Module({
  imports: [
    ScraperModule,
    TypeormConnectorModule,
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
  providers: [ScraperCommand, CollectCommand],
})
export class ScraperCommandModule {}
