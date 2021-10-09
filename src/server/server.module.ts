import { DynamicModule, Module } from '@nestjs/common'
import { TypeormConnectorModule } from '../modules/postgres-connector/postgres-connector.module'
import { ConfigService } from '../modules/config/config.service'
import { HealthcheckModule } from '../modules/healthcheck/healthcheck.module'
import { ServerConfig } from './server.config'

@Module({
  imports: [HealthcheckModule, TypeormConnectorModule],
})
export class ServerModule {
  static forRoot(config: ConfigService<ServerConfig>): DynamicModule {
    return {
      module: ServerModule,
      imports: [...(config ? [HealthcheckModule] : [])],
    }
  }
}
