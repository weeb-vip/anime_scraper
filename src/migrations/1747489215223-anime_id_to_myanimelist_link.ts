import {MigrationInterface, QueryRunner} from "typeorm";

export class animeIdToMyanimelistLink1747489215223 implements MigrationInterface {
    name = 'animeIdToMyanimelistLink1747489215223'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_character" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "anime_character" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "anime_episodes" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "anime_episodes" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "myanimelist_link" ADD "anime_id" character varying(36)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "myanimelist_link" DROP COLUMN "anime_id"`);
        await queryRunner.query(`ALTER TABLE "anime_episodes" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "anime_episodes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "anime_character" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "anime_character" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

}
