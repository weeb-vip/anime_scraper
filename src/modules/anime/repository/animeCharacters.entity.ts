import { Column, CreateDateColumn, Entity, Generated, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'anime_character' })
export class AnimeCharacterEntity {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'anime_id', nullable: false })
  animeID: string

  @Column({ name: 'name', nullable: false })
  name: string

  @Column({ name: 'image', nullable: true })
  image: string

  @Column({ name: 'role', nullable: false })
  role: string

  @Column({ name: 'birthday', nullable: true })
  birthday: string

  @Column({ name: 'zodiac', nullable: true })
  zodiac: string

  @Column({ name: 'gender', nullable: true })
  gender: string

  @Column({ name: 'race', nullable: true })
  race: string

  @Column({ name: 'height', nullable: true })
  height: string

  @Column({ name: 'weight', nullable: true })
  weight: string

  @Column({ name: 'title', nullable: true })
  title: string

  @Column({ name: 'martial_status', nullable: true })
  martial_status: string

  @Column({ name: 'summary', nullable: true })
  summary: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
