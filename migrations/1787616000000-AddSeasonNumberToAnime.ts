import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds anime.season_number: which season of its series an anime is.
 *
 * MyAnimeList files each broadcast run as its own anime; TheTVDB keeps them as
 * seasons of one series. Haruhi is the clean example -- MAL 849 and 4382 are
 * two entries, TheTVDB 79414 is one series whose season 1 ran Apr-Jul 2006 and
 * whose season 2 ran May-Sep 2009, matching our two rows to the day. Nothing in
 * our data said the 2009 one was a second season, because thetvdbid is the same
 * on both and there was nothing to tell them apart.
 *
 * NOT named `season`. That word is already taken here for the broadcast season
 * -- SPRING_2026, the anime_seasons table, animeBySeasons -- and the read store
 * has already had an `anime.season` column added and dropped once. A reader who
 * sees `season` in this schema should keep thinking "Spring 2026".
 *
 * 0 means specials, and the UI renders it as such. It is a real TheTVDB season
 * rather than a sentinel, which is why the column is nullable: null is "we do
 * not know", 0 is "this is the specials season".
 *
 * Filled from thetvdb_link, which already carries season_number per anime and
 * is the curated source -- the admin panel writes it and the enrichment
 * backfill adds to it. The trigger mirrors it here rather than the read path
 * joining, because CDC ships `anime` and does not ship thetvdb_link: a column
 * on this table is the only version of this fact that reaches the API.
 */
export class AddSeasonNumberToAnime1787616000000 implements MigrationInterface {
    name = 'AddSeasonNumberToAnime1787616000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" ADD "season_number" integer`);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION anime_sync_season_number() RETURNS trigger AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    UPDATE "anime" SET season_number = NULL
                    WHERE id = OLD.anime_id::uuid AND season_number IS DISTINCT FROM NULL;

                    RETURN OLD;
                END IF;

                -- IS DISTINCT FROM so a link saved with an unchanged season does
                -- not touch the anime row. Every no-op UPDATE here would be a CDC
                -- event, and anime-sync republishes each one to the algolia and
                -- image subjects.
                UPDATE "anime" SET season_number = NEW.season_number
                WHERE id = NEW.anime_id::uuid
                  AND season_number IS DISTINCT FROM NEW.season_number;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER thetvdb_link_season_number_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "thetvdb_link"
            FOR EACH ROW EXECUTE FUNCTION anime_sync_season_number()
        `);

        // Seed from what is already linked. Small today -- the link table holds
        // a few hundred hand-curated rows -- and the backfill grows it.
        await queryRunner.query(`
            UPDATE "anime" a SET season_number = l.season_number
            FROM "thetvdb_link" l
            WHERE l.anime_id::uuid = a.id AND a.season_number IS DISTINCT FROM l.season_number
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS thetvdb_link_season_number_trigger ON "thetvdb_link"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS anime_sync_season_number()`);
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "season_number"`);
    }
}
