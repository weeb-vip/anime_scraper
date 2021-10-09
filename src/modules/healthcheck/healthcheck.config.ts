import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

export class HealthcheckConfig {
  @Expose()
  @IsString()
  readonly SERVICE_VERSION: string

  @Expose()
  @IsString()
  readonly LOG_LEVEL: string
}
