import { DynamicModule, Module } from '@nestjs/common'
// eslint-disable-next-line import/named
import { ClassConstructor } from 'class-transformer'

import { ConfigService } from './config.service'
import { IConfigServiceOptions } from './types'

@Module({})
export class ConfigModule {
  static register<T>(
    type: ClassConstructor<T>,
    options: IConfigServiceOptions = {},
  ): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService<T>(type, options),
        },
      ],
      exports: [ConfigService],
    }
  }
}
