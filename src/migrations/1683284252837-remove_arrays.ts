import { MigrationInterface, QueryRunner } from 'typeorm'

export class removeArrays1683284252837 implements MigrationInterface {
  name = 'removeArrays1683284252837'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // // get all data from anime
    const data = await queryRunner.query(`SELECT * FROM "anime"`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "title_synonyms"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "title_synonyms" text`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "genres"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "genres" text`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "licensors"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "licensors" text`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "studios"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "studios" text`)

    // update all data from anime
    for (const anime of data) {
      // update title_synonyms
      if (anime.title_synonyms) {
        await queryRunner.query(
          `UPDATE "anime" SET "title_synonyms" = $1 WHERE "id" = $2`,
          [JSON.stringify(anime.title_synonyms), anime.id],
        )
      }

      // update genres
      if (anime.genres) {
        await queryRunner.query(
          `UPDATE "anime" SET "genres" = $1 WHERE "id" = $2`,
          [JSON.stringify(anime.genres), anime.id],
        )
      }

      // update licensors
      if (anime.licensors) {
        await queryRunner.query(
          `UPDATE "anime" SET "licensors" = $1 WHERE "id" = $2`,
          [JSON.stringify(anime.licensors), anime.id],
        )
      }

      // update studios
      if (anime.studios) {
        await queryRunner.query(
          `UPDATE "anime" SET "studios" = $1 WHERE "id" = $2`,
          [JSON.stringify(anime.studios), anime.id],
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const data = await queryRunner.query(`SELECT * FROM "anime"`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "studios"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "studios" text array`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "licensors"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "licensors" text array`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "genres"`)
    await queryRunner.query(`ALTER TABLE "anime" ADD "genres" text array`)
    await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "title_synonyms"`)
    await queryRunner.query(
      `ALTER TABLE "anime" ADD "title_synonyms" text array`,
    )

    // update all data from anime
    for (const anime of data) {
      // update title_synonyms
      if (anime.title_synonyms) {
        await queryRunner.query(
          `UPDATE "anime" SET "title_synonyms" = $1 WHERE "id" = $2`,
          [JSON.parse(anime.title_synonyms), anime.id],
        )
      }

      // update genres
      if (anime.genres) {
        await queryRunner.query(
          `UPDATE "anime" SET "genres" = $1 WHERE "id" = $2`,
          [JSON.parse(anime.genres), anime.id],
        )
      }

      // update licensors
      if (anime.licensors) {
        await queryRunner.query(
          `UPDATE "anime" SET "licensors" = $1 WHERE "id" = $2`,
          [JSON.parse(anime.licensors), anime.id],
        )
      }

      // update studios
      if (anime.studios) {
        await queryRunner.query(
          `UPDATE "anime" SET "studios" = $1 WHERE "id" = $2`,
          [JSON.parse(anime.studios), anime.id],
        )
      }
    }
  }
}
