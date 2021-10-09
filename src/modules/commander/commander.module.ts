import { Module } from '@nestjs/common'
import { ScraperModule } from '../scraper/scraper.module'
import { TypeormConnectorModule } from '../postgres-connector/postgres-connector.module'
import { ScraperCommand } from './scrape.command'
import { CollectCommand } from './collect.command'

@Module({
  imports: [ScraperModule, TypeormConnectorModule],
  controllers: [],
  providers: [ScraperCommand, CollectCommand],
})
export class ScraperCommandModule {}
