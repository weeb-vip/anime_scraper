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
    {
      logger: ['log', 'debug', 'warn', 'error'],
      // Without this, commander matches a parent's options anywhere on the line,
      // so `scrape manga --file urls.json` hands --file to `scrape` and the
      // manga subcommand never sees it. That is why every subcommand option
      // here carries a prefix -- msite, mlimit, csite, climit -- and why --file
      // silently did nothing even after it was declared: declaring an option
      // the parent already owns is not enough to win it.
      //
      // With positional options on, an option belongs to the command it follows.
      // Prefixes stop being necessary and --file reaches the subcommand that
      // declares it.
      enablePositionalOptions: true,
    },
  )

  // await CommandFactory.run(module, ['log', 'warn', 'error']);

  // return app;
}
