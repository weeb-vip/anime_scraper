import {MigrationInterface, QueryRunner} from "typeorm";

export class addMalIdToAnime1749945600000 implements MigrationInterface {
    name = 'addMalIdToAnime1749945600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" ADD "mal_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_anime_mal_id" ON "anime" ("mal_id")`);

        // Backfill mal_id from existing myanimelist_link records
        await queryRunner.query(`
            UPDATE "anime" a
            SET "mal_id" = CAST(
                substring(ml."link" from '/anime/([0-9]+)')
                AS integer
            )
            FROM "myanimelist_link" ml
            WHERE ml."anime_id" = a."id"
            AND ml."link" ~ '/anime/[0-9]+'
            AND a."mal_id" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_anime_mal_id"`);
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "mal_id"`);
    }

}
