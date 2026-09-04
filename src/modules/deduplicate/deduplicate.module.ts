import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { transports, format } from 'winston'
import { AnimeModule } from '../anime/anime.module'
import { alignColorsAndTime } from '../common/loggerformat'
import { DeduplicateService } from './deduplicate.service'

@Module({
  imports: [
    AnimeModule,
    WinstonModule.forRoot(
      ((name: string) => ({
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
          // info line twice, a warning three times and an error four times.
          // They existed to colour each level differently; alignColorsAndTime
          // now picks the colour from the level itself, which is the same
          // result from one transport.
          new transports.Console({
            level: 'debug',
            format: format.combine(alignColorsAndTime(name)),
          }),
        ],
      }))(DeduplicateModule.name),
    ),
  ],
  controllers: [],
  providers: [DeduplicateService],
  exports: [DeduplicateService],
})
export class DeduplicateModule {}
