import * as fs from 'fs'
import { Inject, Injectable } from '@nestjs/common'
import { Logger } from 'winston'

@Injectable()
export class ScrapeRecordService {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  recordSuccessfulScrape(url: string) {
    this.logger.info('Recording successful scrape: ' + url)
    // check if file exists, if not create it
    // check if url is already in file, if so return
    if (!fs.existsSync('scrape_record.txt')) {
      fs.writeFileSync('scrape_record.txt', '')
    }

    // write to file
    fs.appendFileSync('scrape_record.txt', url + '\n')
  }
}
