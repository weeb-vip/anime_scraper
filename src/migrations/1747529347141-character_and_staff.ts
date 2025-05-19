import { MigrationInterface, QueryRunner } from 'typeorm'

export class characterAndStaff1747529347141 implements MigrationInterface {
  name = 'characterAndStaff1747529347141'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "anime_character_staff_link" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "character_id" character varying NOT NULL, "staff_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7cb0007232fbec561bebe1e13dc" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE TABLE "anime_staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "given_name" character varying NOT NULL, "family_name" character varying NOT NULL, "image" character varying, "birthday" character varying, "birth_place" character varying, "blood_type" character varying, "hobbies" character varying, "summary" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6ef4803d840d630832769ae3b69" PRIMARY KEY ("id"))`)
    await queryRunner.query(`ALTER TABLE "anime_character" ADD "image" character varying`)
    await queryRunner.query(`ALTER TABLE "anime_character" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "anime_character" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "anime_character" DROP COLUMN "updated_at"`)
    await queryRunner.query(`ALTER TABLE "anime_character" DROP COLUMN "created_at"`)
    await queryRunner.query(`ALTER TABLE "anime_character" DROP COLUMN "image"`)
    await queryRunner.query(`DROP TABLE "anime_staff"`)
    await queryRunner.query(`DROP TABLE "anime_character_staff_link"`)
  }

}
