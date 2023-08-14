import { MigrationInterface, QueryRunner } from 'typeorm'

export class titleEnEpisode1691976943232 implements MigrationInterface {
  name = 'titleEnEpisode1691976943232'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" RENAME COLUMN "title" TO "title_en"`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" RENAME COLUMN "title_en" TO "title"`,
    )
  }
}
