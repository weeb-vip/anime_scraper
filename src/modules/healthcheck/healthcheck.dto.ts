import { ApiProperty } from '@nestjs/swagger'
import { IsObject } from 'class-validator'

import { IAppState } from './healthcheck.interface'

export class HealthcheckResponse {
  @ApiProperty()
  @IsObject()
  readonly appState: IAppState
}
