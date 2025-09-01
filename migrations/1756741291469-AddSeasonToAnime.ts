import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSeasonToAnime1756741291469 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" ADD "season" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "season"`);
    }

}
