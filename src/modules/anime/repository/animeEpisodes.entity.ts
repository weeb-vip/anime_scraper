import { Column, Entity, Generated, PrimaryColumn } from 'typeorm'

@Entity({ name: 'anime_episodes' })
export class AnimeEpisodesEntity {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'anime_id', nullable: false })
  anime_id: string

  @Column({ name: 'episode', nullable: false })
  episode: number

  @Column({ name: 'title_en', nullable: true })
  title_en: string

  @Column({ name: 'title_jp', nullable: true })
  title_jp: string

  @Column({ name: 'aired', nullable: true, type: 'timestamptz' })
  aired: Date | null

  @Column({ name: 'synopsis', nullable: true })
  synopsis: string
}
