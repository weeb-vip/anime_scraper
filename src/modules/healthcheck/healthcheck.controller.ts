import { Controller, Get } from '@nestjs/common'
import { HealthCheck } from '@nestjs/terminus'
import { HealthService } from './healthcheck.service'

@Controller('healthcheck')
export class HealthCheckController {
  constructor(private healthCheckService: HealthService) {}

  @Get()
  @HealthCheck()
  public check(): Promise<any> {
    return this.healthCheckService.healthCheck()
  }
}
