import { MigrationInterface, QueryRunner } from 'typeorm'

export class episodeAiredDate1691977679901 implements MigrationInterface {
  name = 'episodeAiredDate1691977679901'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime_episodes" DROP COLUMN "aired"`)
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" ADD "aired" TIMESTAMP WITH TIME ZONE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime_episodes" DROP COLUMN "aired"`)
    await queryRunner.query(
      `ALTER TABLE "anime_episodes" ADD "aired" character varying`,
    )
  }
}
