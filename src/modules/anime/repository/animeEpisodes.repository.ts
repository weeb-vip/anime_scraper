import { EntityRepository, Repository } from 'typeorm'
import { AnimeEpisodesEntity } from './animeEpisodes.entity'

@EntityRepository(AnimeEpisodesEntity)
export class AnimeEpisodesRepository extends Repository<AnimeEpisodesEntity> {
  public async findOneById(id: number): Promise<AnimeEpisodesEntity> {
    return await this.findOne({
      where: { id },
    })
  }

  public async findOneByAnimeId(
    anime_id: number,
  ): Promise<AnimeEpisodesEntity[]> {
    return await this.find({
      where: { anime_id },
    })
  }

  public async findOneByAnimeIdAndEpisode(
    anime_id: string,
    episode: number,
  ): Promise<AnimeEpisodesEntity> {
    return await this.findOne({
      where: { anime_id, episode },
    })
  }

  public async upsert(data: AnimeEpisodesEntity): Promise<AnimeEpisodesEntity> {
    const foundAnimeEpisodes = await this.findOneByAnimeIdAndEpisode(
      data.animeID,
      data.episode,
    )

    if (foundAnimeEpisodes) {
      return await this.save({
        ...foundAnimeEpisodes,
        ...data,
      })
    }

    return await this.save(data)
  }
}
