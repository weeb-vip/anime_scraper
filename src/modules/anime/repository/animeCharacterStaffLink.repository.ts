import { EntityRepository, Repository } from 'typeorm'
import { AnimeCharacterStaffLinkEntity } from './animeCharacterStaffLink.entity'

@EntityRepository(AnimeCharacterStaffLinkEntity)
export class AnimeCharacterStaffLinkRepository extends Repository<AnimeCharacterStaffLinkEntity> {
  public async findOneById(id: string): Promise<AnimeCharacterStaffLinkEntity> {
    return await this.findOne({
      where: { id },
    })
  }

  public async findOneByCharacterId(
    characterID: string,
  ): Promise<AnimeCharacterStaffLinkEntity[]> {
    return await this.find({
      where: { characterID },
    })
  }

  public async findOneByStaffId(staffID: string): Promise<AnimeCharacterStaffLinkEntity[]> {
    return await this.find({
      where: { staffID },
    })
  }

  public async findOneByCharacterAndStaffId(
    characterID: string,
    staffID: string,
  ): Promise<AnimeCharacterStaffLinkEntity> {
    return await this.findOne({
      where: { characterID, staffID },
    })
  }

  public async upsert(
    data: Partial<AnimeCharacterStaffLinkEntity>,
  ): Promise<AnimeCharacterStaffLinkEntity> {
    const foundAnimeCharacterStaffLink = await this.findOneByCharacterAndStaffId(
      data.characterID,
      data.staffID,
    )

    if (foundAnimeCharacterStaffLink) {
      return await this.save({
        ...foundAnimeCharacterStaffLink,
        ...data,
      })
    }

    return await this.save(data)
  }
}