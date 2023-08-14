import { MigrationInterface, QueryRunner } from 'typeorm'

export class jptitleEpisode1691975975261 implements MigrationInterface {
  name = 'jptitleEpisode1691975975261'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" ADD "title_jp" character varying`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" DROP COLUMN "title_jp"`,
    )
  }
}
