import * as fs from 'fs'
import * as path from 'path'
// eslint-disable-next-line import/named
import { ClassConstructor, plainToClass } from 'class-transformer'
import { validateSync, ValidationError } from 'class-validator'
import * as dotenv from 'dotenv'

import { IConfigServiceOptions } from './types'

export class ConfigService<T> {
  public readonly env: T

  constructor(
    private readonly type: ClassConstructor<T>,
    options: IConfigServiceOptions = {},
  ) {
    dotenv.config({ path: this.resolveEnvFile(options.envFile) })

    this.env = this.inputToClass(process.env)

    this.validateInput(this.env)
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private inputToClass(configObject: object): T {
    return plainToClass(this.type, configObject, {
      excludeExtraneousValues: true,
    })
  }

  private validateInput(envConfig: T): T {
    const errors: ReadonlyArray<ValidationError> = validateSync(
      // eslint-disable-next-line @typescript-eslint/ban-types
      envConfig as unknown as object,
      {
        validationError: { target: false },
      },
    )

    if (errors.length) {
      // tslint:disable-next-line no-throw
      throw new MultipleValidationError(errors, this.type.name)
    }

    return envConfig
  }

  public resolveEnvFile(envFile: string): string {
    const optionsEnvFile: string = path.join(
      process.cwd(),
      envFile ?? 'env.local.env',
    )
    if (fs.existsSync(optionsEnvFile)) {
      return optionsEnvFile
    }
    if (fs.existsSync(path.join(process.cwd(), envFile ?? 'env.test.env'))) {
      return path.join(process.cwd(), envFile ?? 'env.test.env')
    }

    return path.join(process.cwd(), '.env')
  }
}

class MultipleValidationError extends Error {
  constructor(
    public readonly errors: ReadonlyArray<ValidationError>,
    typeName: string,
  ) {
    super(
      [
        `Found ${errors.length} validation error${
          errors.length === 1 ? '' : 's'
        } while validating ${typeName}:`,
        ...errors.map(
          (e: ValidationError): string =>
            ` - ${`${e}`.trimEnd().replace(/\n/g, '\n   ')}`,
        ),
      ].join('\n\n'),
    )
  }
}
