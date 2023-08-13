import { Column, Entity, Generated, PrimaryColumn } from 'typeorm'

@Entity({ name: 'anime_episodes' })
export class AnimeEpisodesEntity {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'anime_id', nullable: false })
  animeID: string

  @Column({ name: 'episode', nullable: false })
  episode: number

  @Column({ name: 'title', nullable: true })
  title: string

  @Column({ name: 'aired', nullable: true })
  aired: string

  @Column({ name: 'synopsis', nullable: true })
  synopsis: string
}
