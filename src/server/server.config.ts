// eslint-disable-next-line import/named
import { Expose, Transform, TransformFnParams } from 'class-transformer'
import { IsBoolean, IsNumber, IsString } from 'class-validator'

export class ServerConfig {
  @Expose()
  @IsString()
  readonly SERVICE_VERSION: string

  @Expose()
  @IsString()
  readonly HOSTNAME: string

  @Expose()
  @IsNumber()
  @Transform(({ value }: TransformFnParams): number =>
    value !== undefined ? Number(value) : undefined,
  )
  readonly PORT: number

  @Expose()
  @IsBoolean()
  @Transform(({ value }: TransformFnParams): boolean =>
    value !== undefined ? value === 'true' : undefined,
  )
  readonly NESTJS_LOGS_ENABLED: boolean
}
