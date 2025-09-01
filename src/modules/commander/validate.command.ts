import { Inject } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'
import { Logger } from 'winston'
import { AnimeService } from '../anime/anime.service'

@Command({
  name: 'validate',
  description: 'Validate anime data integrity and check for orphaned records',
})
export class ValidateCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly animeService: AnimeService,
  ) {
    super()
  }

  async run(): Promise<void> {
    this.logger.info('Starting anime data integrity validation...')
    
    try {
      const integrity = await this.animeService.validateAnimeIntegrity()
      
      this.logger.info(`Anime Data Integrity Report:`)
      this.logger.info(`- Total Anime: ${integrity.totalAnime}`)
      this.logger.info(`- Properly Linked: ${integrity.linkedAnime}`)
      this.logger.info(`- Orphaned (No MyAnimeList Link): ${integrity.orphanedAnime}`)
      
      if (integrity.orphanedAnime > 0) {
        this.logger.warn(`Found ${integrity.orphanedAnime} orphaned anime records!`)
        this.logger.info('Orphaned anime:')
        integrity.orphanedList.forEach((anime, index) => {
          this.logger.info(`  ${index + 1}. ${anime.title_en || anime.title_jp || 'Unknown'} (ID: ${anime.id})`)
        })
        
        this.logger.warn('These anime records exist without MyAnimeList links and should be investigated.')
      } else {
        this.logger.info('✅ All anime records are properly linked to MyAnimeList!')
      }
      
    } catch (error) {
      this.logger.error(`Error during validation: ${error.message}`, error)
    }
  }
}