import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm'
import { Anime } from './anime.entity'
import { SeasonYear } from '../../common/season.types'

export enum SeasonStatus {
  NEW = 'new',
  CONTINUING = 'continuing',
  FINAL = 'final',
  UNKNOWN = 'unknown'
}

@Entity({ name: 'anime_seasons' })
@Unique(['anime', 'season']) // Ensure an anime can only be in a season once
@Index(['season']) // Index for querying by season
@Index(['status']) // Index for querying by status
export class AnimeSeasonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Anime, anime => anime.seasons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anime_id' })
  anime: Anime

  @Column({ type: 'varchar' })
  season: SeasonYear

  @Column({
    type: 'enum',
    enum: SeasonStatus,
    default: SeasonStatus.UNKNOWN
  })
  status: SeasonStatus

  @Column({ type: 'int', nullable: true })
  episode_count: number

  @Column({ type: 'text', nullable: true })
  notes: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}