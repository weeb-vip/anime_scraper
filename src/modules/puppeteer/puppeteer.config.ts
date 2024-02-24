import { IsString } from 'class-validator'
import { Expose } from 'class-transformer'

export class PuppeteerConfig {
  @Expose()
  @IsString()
  PUPPETEER_EXECUTABLE_PATH: string
}
