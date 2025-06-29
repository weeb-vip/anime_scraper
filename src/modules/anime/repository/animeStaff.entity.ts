import { Column, CreateDateColumn, Entity, Generated, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'anime_staff' })
export class AnimeStaffEntity {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'given_name', nullable: false })
  given_name: string

  @Column({ name: 'family_name', nullable: false })
  family_name: string

  @Column({ name: 'image', nullable: true })
  image: string

  @Column({ name: 'birthday', nullable: true })
  birthday: string

  @Column({ name: 'birth_place', nullable: true })
  birth_place: string

  @Column({ name: 'blood_type', nullable: true })
  blood_type: string

  @Column({ name: 'hobbies', nullable: true })
  hobbies: string

  @Column({ name: 'summary', nullable: true })
  summary: string

  @Column({ name: 'language', nullable: true })
  language: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
