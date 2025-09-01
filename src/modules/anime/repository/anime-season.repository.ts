import { EntityRepository, Repository } from 'typeorm'
import { AnimeSeasonEntity } from './anime-season.entity'
import * as _ from 'lodash'

@EntityRepository(AnimeSeasonEntity)
export class AnimeSeasonRepository extends Repository<AnimeSeasonEntity> {
  public async upsert(body: Partial<AnimeSeasonEntity>): Promise<AnimeSeasonEntity> {
    // Remove null/undefined fields
    const nullFields: readonly string[] = Object.keys(body).reduce(
      (empty: readonly string[], key: string) =>
        !body[key] ? empty.concat(key) : empty,
      [],
    )
    const cleanBody: Partial<AnimeSeasonEntity> = _.omit(body, nullFields)
    
    // Try to find existing record by anime and season
    if (cleanBody.anime && cleanBody.season) {
      const existing = await this.findOne({
        where: {
          anime: { id: cleanBody.anime.id },
          season: cleanBody.season
        }
      })
      
      if (existing) {
        // Update existing record
        await this.update(existing.id, cleanBody)
        return this.findOne(existing.id)
      }
    }
    
    // Create new record
    const entity = this.create(cleanBody)
    return this.save(entity)
  }
}