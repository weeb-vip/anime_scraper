import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { RECORD_TYPE } from './interface'

@Entity({ name: 'myanimelist_link' })
export class MyanimelistLinks {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'type', enum: RECORD_TYPE, default: RECORD_TYPE.Anime })
  type: RECORD_TYPE

  @Column({ name: 'name' })
  name: string

  @Column({ name: 'link' })
  link: string

  @Column({ name: 'anime_id', nullable: true, type: 'varchar', length: 36 })
  animeId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
