import { MigrationInterface, QueryRunner } from 'typeorm'

export class addRatingField1682994836326 implements MigrationInterface {
  name = 'addRatingField1682994836326'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "rating" character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "anime" ALTER COLUMN "type" SET DEFAULT 'anime'`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "title_synonyms"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "title_synonyms" text array`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "start_date"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "start_date" TIMESTAMP WITH TIME ZONE`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "end_date"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "end_date" TIMESTAMP WITH TIME ZONE`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "genres"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "genres" text array`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "licensors"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "licensors" text array`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "studios"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "studios" text array`)
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "type" SET DEFAULT 'anime'`,
    )
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "created_at" SET DEFAULT now()`,
    )
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    )
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    )
    await queryRunner.query(
      `ALTER TABLE "myanimelist_link" ALTER COLUMN "type" DROP DEFAULT`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "studios"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "studios" character varying array`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "licensors"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "licensors" character varying array`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "genres"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "genres" character varying array`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "end_date"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "end_date" character varying`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "start_date"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "start_date" character varying`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "title_synonyms"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "title_synonyms" character varying array`,
    )
    await queryRunner.query(
      `ALTER TABLE "anime" ALTER COLUMN "type" DROP DEFAULT`,
    )
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "rating"`)
  }
}
