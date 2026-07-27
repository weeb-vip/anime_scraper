import {MigrationInterface, QueryRunner} from "typeorm";

export class addTrailerUrlToAnime1749945700000 implements MigrationInterface {
    name = 'addTrailerUrlToAnime1749945700000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" ADD "trailer_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "trailer_url"`);
    }

}
