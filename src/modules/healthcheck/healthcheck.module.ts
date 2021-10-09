import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigModule } from '../config/config.module'
import { AppHealthIndicator } from './app.health'
import { HealthcheckConfig } from './healthcheck.config'
import { HealthCheckController } from './healthcheck.controller'
import { HealthService } from './healthcheck.service'

@Module({
  imports: [TerminusModule, ConfigModule.register(HealthcheckConfig)],
  providers: [AppHealthIndicator, HealthService],
  controllers: [HealthCheckController],
})
export class HealthcheckModule {}
