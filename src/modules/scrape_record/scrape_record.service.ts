import * as fs from 'fs'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ScrapeRecordService {
  constructor() {}

  recordSuccessfulScrape(url: string) {
    console.log('Recording successful scrape: ' + url)
    // check if file exists, if not create it
    // check if url is already in file, if so return
    if (!fs.existsSync('scrape_record.txt')) {
      fs.writeFileSync('scrape_record.txt', '')
    }

    // write to file
    fs.appendFileSync('scrape_record.txt', url + '\n')
  }
}
