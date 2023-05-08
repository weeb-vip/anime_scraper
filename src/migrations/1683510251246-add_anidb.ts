import { MigrationInterface, QueryRunner } from 'typeorm'

export class addAnidb1683510251246 implements MigrationInterface {
  name = 'addAnidb1683510251246'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "anidbid" character varying`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "anidbid"`)
  }
}
