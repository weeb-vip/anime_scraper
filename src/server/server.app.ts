import { CommandFactory } from 'nest-commander'
import { ConfigService } from './../modules/config/config.service'
import { ServerConfig } from './server.config'
import { BootstrapModule } from './bootstrap.module'

export async function start(): Promise<void> {
  const serverConfig: ConfigService<ServerConfig> = new ConfigService(
    ServerConfig,
  )

  /*const app: INestApplication = await NestFactory.create(
    ServerModule.forRoot(serverConfig),
    {
      ...(!serverConfig.env.NESTJS_LOGS_ENABLED ? { logger: false } : {}),
    },
  );

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe());*/

  await CommandFactory.runWithoutClosing(
    // @ts-ignore
    BootstrapModule.forRoot(serverConfig),
    ['log', 'debug', 'warn', 'error'],
  )

  // await CommandFactory.run(module, ['log', 'warn', 'error']);

  // return app;
}
