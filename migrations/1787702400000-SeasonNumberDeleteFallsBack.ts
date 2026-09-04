import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * On deleting a link, fall back to whatever links remain.
 *
 * The first version of this trigger nulled anime.season_number whenever any
 * link was deleted. That is right when the deleted link was the only one, and
 * wrong the moment it is not: thetvdb_link holds 31 anime with two rows each --
 * a latent upsert bug wrote a second row instead of updating the first -- and
 * removing either of a pair would have blanked a season the surviving link
 * still names.
 *
 * So the delete branch now asks what is left rather than assuming nothing is.
 * With no remaining link the subquery is null and the column clears, which is
 * the original behaviour for the only case it was ever correct in.
 */
export class SeasonNumberDeleteFallsBack1787702400000 implements MigrationInterface {
    name = 'SeasonNumberDeleteFallsBack1787702400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION anime_sync_season_number() RETURNS trigger AS $$
            DECLARE
                remaining integer;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    -- The most recently touched of the links that survive this
                    -- delete, or null when none do.
                    SELECT l.season_number INTO remaining
                    FROM "thetvdb_link" l
                    WHERE l.anime_id = OLD.anime_id AND l.id <> OLD.id
                    ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
                    LIMIT 1;

                    UPDATE "anime" SET season_number = remaining
                    WHERE id = OLD.anime_id::uuid
                      AND season_number IS DISTINCT FROM remaining;

                    RETURN OLD;
                END IF;

                UPDATE "anime" SET season_number = NEW.season_number
                WHERE id = NEW.anime_id::uuid
                  AND season_number IS DISTINCT FROM NEW.season_number;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION anime_sync_season_number() RETURNS trigger AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    UPDATE "anime" SET season_number = NULL
                    WHERE id = OLD.anime_id::uuid AND season_number IS DISTINCT FROM NULL;

                    RETURN OLD;
                END IF;

                UPDATE "anime" SET season_number = NEW.season_number
                WHERE id = NEW.anime_id::uuid
                  AND season_number IS DISTINCT FROM NEW.season_number;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
    }
}
