import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Generalises myanimelist_link so it can resolve a MAL URL to something other
 * than an anime.
 *
 * The table's `type` column has carried a RECORD_TYPE enum since it was created
 * -- anime, manga, character, staff, studio, user -- but only ever held 'anime',
 * because the only foreign key on the row is anime_id. A manga link has had a
 * type to declare and nowhere to point.
 *
 * That matters for more than manga. This table is how a scraped MAL URL becomes
 * one of our ids, and it is what lets us record a relationship to something we
 * have not scraped yet: store the URL now, resolve it when the other side
 * arrives. Without a generic target, every cross-record link has to be dropped
 * at write time and is never recovered.
 *
 * anime_id is left in place rather than renamed. Nothing downstream reads this
 * table -- it exists only inside the scraper and is not carried by CDC, so a
 * rename would be safe from MySQL's point of view -- but the scraper's own
 * entity and repository still reference animeId, and a rename makes the
 * migration and the code change a single atomic deploy or an outage. Expanding
 * first lets the two land independently; the drop is a follow-up once nothing
 * reads the old column.
 */
export class GeneralizeMyanimelistLinkRecordId1787184000000 implements MigrationInterface {
    name = 'GeneralizeMyanimelistLinkRecordId1787184000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "myanimelist_link" ADD "record_id" character varying(36)`);

        // Backfill: every existing row is an anime link by construction.
        await queryRunner.query(`UPDATE "myanimelist_link" SET "record_id" = "anime_id" WHERE "anime_id" IS NOT NULL`);

        // The resolution lookup is "given this MAL URL, what is our id", and it
        // runs once per related entry on every scraped page. Unique on the URL
        // because one MAL URL is one record; the type is carried in the index so
        // the common query can be answered without touching the heap.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_myanimelist_link_link" ON "myanimelist_link" ("link")`);
        await queryRunner.query(`CREATE INDEX "IDX_myanimelist_link_type_record" ON "myanimelist_link" ("type", "record_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_myanimelist_link_type_record"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_myanimelist_link_link"`);
        await queryRunner.query(`ALTER TABLE "myanimelist_link" DROP COLUMN "record_id"`);
    }
}
