import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { alignColorsAndTime } from '../common/loggerformat'
import { ScrapeRecordService } from './scrape_record.service'

@Module({
  imports: [
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
      }))(ScrapeRecordModule.name),
    ),
  ],
  providers: [ScrapeRecordService],
  exports: [ScrapeRecordService],
})
export class ScrapeRecordModule {}
