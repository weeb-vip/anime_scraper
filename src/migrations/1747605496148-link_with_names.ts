import {MigrationInterface, QueryRunner} from "typeorm";

export class linkWithNames1747605496148 implements MigrationInterface {
    name = 'linkWithNames1747605496148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" ADD "character_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" ADD "staff_given_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" ADD "staff_family_name" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" DROP COLUMN "staff_family_name"`);
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" DROP COLUMN "staff_given_name"`);
        await queryRunner.query(`ALTER TABLE "anime_character_staff_link" DROP COLUMN "character_name"`);
    }

}
