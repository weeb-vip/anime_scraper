import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { RECORD_TYPE } from './interface'

@Entity({ name: 'anime' })
export class Anime {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'anidbid', nullable: true })
  anidbid: string

  @Column({ name: 'type', enum: RECORD_TYPE, default: RECORD_TYPE.Anime })
  type: RECORD_TYPE

  @Column({ name: 'title_en', nullable: true })
  title_en: string

  @Column({ name: 'title_jp', nullable: true })
  title_jp: string

  @Column({ name: 'title_romaji', nullable: true })
  title_romaji: string

  @Column({ name: 'title_kanji', nullable: true })
  title_kanji: string

  @Column('text', {
    name: 'title_synonyms',
    array: false,
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return JSON.stringify(value)
      },
      from(value: string): string[] {
        return JSON.parse(value)
      },
    },
  })
  title_synonyms: string[]

  @Column({ name: 'image_url', nullable: true })
  image_url: string

  @Column({ name: 'synopsis', nullable: true })
  synopsis: string

  @Column({ name: 'episodes', nullable: true })
  episodes: number

  @Column({ name: 'status', nullable: true })
  status: string

  @Column({ name: 'start_date', nullable: true, type: 'timestamptz' })
  startDate: Date | null

  @Column({ name: 'end_date', nullable: true, type: 'timestamptz' })
  endDate: Date | null

  @Column('text', {
    name: 'genres',
    array: false,
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return JSON.stringify(value)
      },
      from(value: string): string[] {
        return JSON.parse(value)
      },
    },
  })
  genres: string[]

  @Column({ name: 'duration', nullable: true })
  duration: string

  @Column({ name: 'broadcast', nullable: true })
  broadcast: string

  @Column({ name: 'source', nullable: true })
  source: string

  @Column('text', {
    name: 'licensors',
    array: false,
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return JSON.stringify(value)
      },
      from(value: string): string[] {
        return JSON.parse(value)
      },
    },
  })
  licensors: string[]

  @Column('text', {
    name: 'studios',
    array: false,
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return JSON.stringify(value)
      },
      from(value: string): string[] {
        return JSON.parse(value)
      },
    },
  })
  studios: string[]

  @Column({ name: 'rating', nullable: true })
  rating: string

  @Column({ name: 'ranking', nullable: true })
  ranking: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
