import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { WORK_TYPE } from './interface'

// A JSON array in a text column, matching how anime stores genres, studios and
// licensors. The values that go in are cleaned first -- see
// common/scrapedList.ts -- so this column does not inherit the placeholder rows
// that convention left in anime.studios.
const jsonArray = {
  to(value: string[]): string {
    return JSON.stringify(value ?? [])
  },
  from(value: string): string[] {
    if (!value) {
      return []
    }
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  },
}

@Entity({ name: 'work' })
export class Work {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  // The identity. Unique, so a re-scrape updates instead of duplicating.
  @Column({ name: 'mal_id', nullable: true, type: 'int' })
  malId: number

  @Column({ name: 'type', enum: WORK_TYPE, default: WORK_TYPE.Manga })
  type: WORK_TYPE

  // Assigned by a postgres trigger on insert and never rewritten afterwards,
  // because it is a public URL. Leave it undefined when saving; setting it to
  // null asks the trigger to mint a fresh one.
  @Column({ name: 'url_slug', nullable: true })
  urlSlug: string

  @Column({ name: 'title_en', nullable: true })
  titleEn: string

  // The romanised Japanese title, from the page heading. Distinct from titleEn:
  // "Karakai Jouzu no Takagi-san" and "Teasing Master Takagi-san" are both real
  // and a row can carry both. This is the only one of the three MAL always has.
  @Column({ name: 'title_romaji', nullable: true })
  titleRomaji: string

  @Column({ name: 'title_jp', nullable: true })
  titleJp: string

  @Column('text', { name: 'title_synonyms', nullable: true, transformer: jsonArray })
  titleSynonyms: string[]

  @Column({ name: 'synopsis', nullable: true, type: 'text' })
  synopsis: string

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string

  @Column({ name: 'status', nullable: true })
  status: string

  @Column({ name: 'volumes', nullable: true, type: 'int' })
  volumes: number

  @Column({ name: 'chapters', nullable: true, type: 'int' })
  chapters: number

  @Column({ name: 'published_from', nullable: true, type: 'timestamptz' })
  publishedFrom: Date | null

  @Column({ name: 'published_to', nullable: true, type: 'timestamptz' })
  publishedTo: Date | null

  // The one field that differs between manga and light novels on MAL, and the
  // reason the type column exists rather than a separate table.
  @Column({ name: 'demographic', nullable: true })
  demographic: string

  @Column({ name: 'serialization', nullable: true })
  serialization: string

  @Column('text', { name: 'authors', nullable: true, transformer: jsonArray })
  authors: string[]

  // double precision, not numeric. Debezium encodes numeric columns as base64
  // bytes under its default decimal.handling.mode, which a float consumer
  // cannot read -- see migration 1787360400000.
  @Column({ name: 'score', nullable: true, type: 'double precision' })
  score: number

  @Column({ name: 'ranking', nullable: true, type: 'int' })
  ranking: number

  @Column({ name: 'members', nullable: true, type: 'int' })
  members: number

  @Column({ name: 'favorites', nullable: true, type: 'int' })
  favorites: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
