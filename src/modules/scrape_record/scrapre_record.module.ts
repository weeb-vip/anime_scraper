import { Module } from '@nestjs/common'
import { ScrapeRecordService } from './scrape_record.service'

@Module({
  imports: [],
  providers: [ScrapeRecordService],
  exports: [ScrapeRecordService],
})
export class ScrapeRecordModule {}
