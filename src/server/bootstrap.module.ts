import { DynamicModule, Module } from '@nestjs/common'
import { ScraperCommandModule } from '../modules/commander/commander.module'
import { TypeormConnectorModule } from '../modules/postgres-connector/postgres-connector.module'
import { ConfigService } from '../modules/config/config.service'
import { HealthcheckModule } from '../modules/healthcheck/healthcheck.module'
import { ServerConfig } from './server.config'

@Module({
  imports: [HealthcheckModule, TypeormConnectorModule],
})
export class BootstrapModule {
  static forRoot(config: ConfigService<ServerConfig>): DynamicModule {
    return {
      module: BootstrapModule,
      imports: [ScraperCommandModule],
    }
  }
}
