import { Inject, Injectable } from '@nestjs/common'
import { Logger } from 'winston'
import { AnimeService } from '../anime/anime.service'
@Injectable()
export class DeduplicateService {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly animeService: AnimeService,
  ) {}

  async deduplicate(): Promise<void> {
    const duplicates = await this.animeService.getDuplicates()
    const duplicateByNames = new Map<string, any[]>()
    for (const duplicate of duplicates) {
      if (!duplicateByNames.has(duplicate.title_en)) {
        duplicateByNames.set(duplicate.title_en, [])
      }
      duplicateByNames.get(duplicate.title_en).push(duplicate)
    }

    for (const [name, items] of duplicateByNames) {
      if (items.length > 1) {
        this.logger.info(`Found ${items.length} duplicates for ${name}`)
        const sorted = items.sort((a, b) => {
          if (a.startDate === null && b.startDate === null) {
            return 0
          }
          if (a.startDate === null) {
            return 1
          }
          if (b.startDate === null) {
            return -1
          }
          return a.startDate.getTime() - b.startDate.getTime()
        })
        // delete anime episodes
        await this.removeEpisodes(sorted[0].id)
        const toRemove = sorted.slice(1)
        for (const item of toRemove) {
          this.logger.info(
            `Removing duplicate ${item.title_en} with id ${item.id}`,
          )
          await this.animeService.deleteAnime(item.id)
        }
      }
    }
  }

  removeEpisodes(animeId: string) {
    return this.animeService.deleteAnimeEpisodes(animeId)
  }
}
