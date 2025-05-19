import { EntityRepository, Repository } from 'typeorm'
import { AnimeStaffEntity } from './animeStaff.entity'

@EntityRepository(AnimeStaffEntity)
export class AnimeStaffRepository extends Repository<AnimeStaffEntity> {
  public async findOneById(id: string): Promise<AnimeStaffEntity> {
    return await this.findOne({
      where: { id },
    })
  }

  public async findOneByCharacterId(
    characterID: string,
  ): Promise<AnimeStaffEntity[]> {
    return await this.find({
      where: { characterID },
    })
  }


  public async findOneByName(
    given_name: string,
    family_name: string,
  ): Promise<AnimeStaffEntity> {
    return await this.findOne({
      where: { given_name, family_name },
    })
  }

  public async upsert(
    data: AnimeStaffEntity,
  ): Promise<AnimeStaffEntity> {
    const foundAnimeStaff = await this.findOneByName(
      data.given_name,
      data.family_name,
    )

    if (foundAnimeStaff) {
      return await this.save({
        ...foundAnimeStaff,
        ...data,
      })
    }

    return await this.save(data)
  }
}