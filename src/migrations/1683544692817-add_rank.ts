import { MigrationInterface, QueryRunner } from 'typeorm'

export class addRank1683544692817 implements MigrationInterface {
  name = 'addRank1683544692817'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime" ADD "ranking" integer`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "ranking"`)
  }
}
