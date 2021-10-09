import { Injectable } from '@nestjs/common'
import { HealthCheckService } from '@nestjs/terminus'
import { AppHealthIndicator } from './app.health'

@Injectable()
export class HealthService {
  constructor(
    private appHealthIndicator: AppHealthIndicator,
    private health: HealthCheckService,
  ) {}

  async healthCheck(): Promise<any> {
    return this.health
      .check([async (): Promise<any> => this.appHealthIndicator.getStatus()])
      .catch((error: any): any => {
        return error
      })
  }
}
