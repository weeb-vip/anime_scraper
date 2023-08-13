import { EntityRepository, Repository } from 'typeorm'
import { AnimeCharacterEntity } from './animeCharacters.entity'

@EntityRepository(AnimeCharacterEntity)
export class AnimeCharacterRepository extends Repository<AnimeCharacterEntity> {
  public async findOneById(id: number): Promise<AnimeCharacterEntity> {
    return await this.findOne({
      where: { id },
    })
  }

  public async findOneByAnimeId(
    anime_id: number,
  ): Promise<AnimeCharacterEntity[]> {
    return await this.find({
      where: { anime_id },
    })
  }

  public async findOneByAnimeIdAndName(
    anime_id: string,
    name: string,
  ): Promise<AnimeCharacterEntity> {
    return await this.findOne({
      where: { anime_id, name },
    })
  }

  public async upsert(
    data: AnimeCharacterEntity,
  ): Promise<AnimeCharacterEntity> {
    const foundAnimeCharacter = await this.findOneByAnimeIdAndName(
      data.anime_id,
      data.name,
    )

    if (foundAnimeCharacter) {
      return await this.save({
        ...foundAnimeCharacter,
        ...data,
      })
    }

    return await this.save(data)
  }
}
