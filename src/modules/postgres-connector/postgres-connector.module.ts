import * as fs from 'fs'
import { Module } from '@nestjs/common'

import { ConnectionOptions } from 'typeorm'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '../config/config.service'
import { ConfigModule } from '../config/config.module'
import { PostgresConnectorConfig } from './postgres-connector.config'

const useCert: boolean = fs.existsSync(`${process.cwd()}/secrets/cert`)
// eslint-disable-next-line @typescript-eslint/ban-types
const ssl: object = {
  ssl: true,
  extra: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      ...(useCert
        ? {
            ca: fs.readFileSync(`${process.cwd()}/secrets/cert`).toString(),
          }
        : {}),
    },
  },
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // connectionName: dataSourceConnectionName,
      // name: dataSourceConnectionName,
      imports: [ConfigModule.register(PostgresConnectorConfig)],
      useFactory: (
        config: ConfigService<PostgresConnectorConfig>,
      ): ConnectionOptions => {
        const options: ConnectionOptions = {
          type: 'postgres',
          host: config.env.PGHOST,
          port: config.env.PGPORT,
          username: config.env.PGUSERNAME,
          password: config.env.PGPASSWORD,
          database: config.env.PGDATABASE,
          ...(process.env.ENV !== 'local' && process.env.ENV !== 'dev'
            ? ssl
            : {}),
          synchronize: false,
          ...(process.env.ENV !== 'local'
            ? { entities: ['modules/**/*.entity.{ts,js}'] }
            : { entities: ['dist/modules/**/*.entity.{ts,js}'] }),
          migrations: ['migration/*.js'],
          cli: {
            migrationsDir: 'migration',
          },
        }

        return options
      },
      inject: [ConfigService],
    }),
  ],
})
export class TypeormConnectorModule {}
