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

  // What this link points at, whatever kind of record that is. `type` says
  // which table to read it from; together they are the resolution key.
  //
  // anime_id stays for now so this column and the code that fills it can deploy
  // separately. It is the one to drop once nothing reads it.
  @Column({ name: 'record_id', nullable: true, type: 'varchar', length: 36 })
  recordId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
