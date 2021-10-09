import { Expose, Type, Transform } from 'class-transformer'
import { IsNumber, IsString } from 'class-validator'

export class PostgresConnectorConfig {
  @Expose()
  @IsString()
  readonly PGHOST: string

  @Expose()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  readonly PGPORT: number

  @Expose()
  @IsString()
  readonly PGUSERNAME: string

  @Expose()
  @IsString()
  readonly PGPASSWORD: string

  @Expose()
  @IsString()
  readonly PGDATABASE: string
}

export const dataSourceConnectionName = 'DATA_SOURCE_POSTGRES'
