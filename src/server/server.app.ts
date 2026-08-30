import { Command } from 'commander'
import { CommandFactory } from 'nest-commander'
import { Commander } from 'nest-commander/src/constants'
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

  // Positional options: an option belongs to the command it follows.
  //
  // Without them commander matches a parent's option anywhere on the line, so
  // `scrape manga --file urls.json` hands --file to `scrape` and the manga
  // subcommand never sees it. That is why the subcommands here grew prefixed
  // options -- csite and climit on `new`, msite and mlimit on `manga` -- and
  // why --file silently did nothing even once it was declared: declaring an
  // option the parent already owns is not enough to win it.
  const app = await CommandFactory.createWithoutRunning(
    // @ts-ignore
    BootstrapModule.forRoot(serverConfig),
    {
      logger: ['log', 'debug', 'warn', 'error'],
      enablePositionalOptions: true,
    },
  )

  // The flag above is not sufficient on its own. nest-commander applies it to
  // the commands it builds from decorators and never to the root program, but
  // commander reads the setting from the root when it decides who owns an
  // option -- so with only the flag set, `collect manga --headless` still gave
  // --headless to `collect`, the subcommand saw headless: false, and puppeteer
  // tried to open a real browser window on a machine with no display.
  //
  // The root is provided under a symbol nest-commander exports from its module
  // but not from its index, hence the deeper import. If a future version starts
  // configuring the root itself, this line becomes redundant rather than wrong.
  app.get<Command>(Commander).enablePositionalOptions(true)

  await CommandFactory.runApplication(app)

  // await CommandFactory.run(module, ['log', 'warn', 'error']);

  // return app;
}
