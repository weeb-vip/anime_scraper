import {MigrationInterface, QueryRunner} from "typeorm";

export class language1748199934660 implements MigrationInterface {
    name = 'language1748199934660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_staff" ADD "language" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_staff" DROP COLUMN "language"`);
    }

}
