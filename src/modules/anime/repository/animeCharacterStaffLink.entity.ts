import { Column, CreateDateColumn, Entity, Generated, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'anime_character_staff_link' })
export class AnimeCharacterStaffLinkEntity {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string

  @Column({ name: 'character_id', nullable: false })
  characterID: string

  @Column({ name: 'staff_id', nullable: false })
  staffID: string

  @Column({ name: 'character_name', nullable: false })
  characterName: string

  @Column({ name: 'staff_given_name', nullable: false })
  staffGivenName: string

  @Column({ name: 'staff_family_name', nullable: false })
  staffFamilyName: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
