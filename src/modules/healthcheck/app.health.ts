import { Injectable } from '@nestjs/common'
import * as pidUsage from 'pidusage'
import { ConfigService } from '../config/config.service'
import { HealthcheckConfig } from './healthcheck.config'
import { HealthcheckResponse } from './healthcheck.dto'
import { IUsage } from './healthcheck.interface'

@Injectable()
export class AppHealthIndicator {
  constructor(private readonly config: ConfigService<HealthcheckConfig>) {}

  public async getStatus(): Promise<HealthcheckResponse> {
    const usageStats: any = await pidUsage(process.pid)
    const usage: IUsage = {
      cpu: Math.round((usageStats.cpu + Number.EPSILON) * 100) / 100,
      memory:
        Math.round((usageStats.memory / 1024 / 1024 + Number.EPSILON) * 100) /
        100,
    }

    const appState: { readonly ready: number } = { ready: 1 }

    return {
      appState: {
        version: this.config.env.SERVICE_VERSION,
        ...(this.config.env.LOG_LEVEL === 'debug' ? { usage } : {}),
        ...(this.config.env.LOG_LEVEL === 'debug' ? { app: appState } : {}),
      },
    }
  }
}
