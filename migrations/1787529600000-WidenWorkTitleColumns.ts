import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Widens work's title columns from varchar(255) to text.
 *
 * Two light novels failed the manga re-scrape with
 *
 *     value too long for type character varying(255)
 *
 * because MyAnimeList titles them at 282 characters. That is not an outlier
 * to guard against so much as a genre convention: the heading on 182702 runs
 * to a full sentence of plot, and the catalogue has thousands in that shape.
 *
 * They only started failing with the manga heading fix. Before it, title_en
 * came from the sidebar's "English:" row alone, which those rows do not have,
 * so the column stayed null and the insert fit. Falling back to the heading is
 * what put a 282-character string into a 255-character column.
 *
 * text rather than a bigger varchar, because the same table's sibling already
 * settled this: `anime` has had title_en and title_romaji as text since
 * migration 000001. work's varchar(255) was the inconsistent one. In postgres
 * the two are the same storage with the same performance -- the length cap is
 * the only difference, and it is a cap nothing here wants.
 */
export class WidenWorkTitleColumns1787529600000 implements MigrationInterface {
    name = 'WidenWorkTitleColumns1787529600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "title_en" TYPE text`);
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "title_jp" TYPE text`);

        // title_romaji arrives with the manga heading fix, which may not have
        // landed yet -- and where it has already run, the column exists as
        // varchar(255) and needs the same widening as its neighbours. Guarded
        // so this migration is correct whichever order the two land in.
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'work' AND column_name = 'title_romaji'
                ) THEN
                    ALTER TABLE "work" ALTER COLUMN "title_romaji" TYPE text;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Truncating rather than failing: by the time anyone runs this down
        // there may be titles that no longer fit, and a migration that cannot
        // be reversed without hand-editing data is worse than a lossy one.
        await queryRunner.query(`UPDATE "work" SET "title_en" = left("title_en", 255) WHERE length("title_en") > 255`);
        await queryRunner.query(`UPDATE "work" SET "title_jp" = left("title_jp", 255) WHERE length("title_jp") > 255`);
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "title_en" TYPE character varying(255)`);
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "title_jp" TYPE character varying(255)`);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'work' AND column_name = 'title_romaji'
                ) THEN
                    UPDATE "work" SET "title_romaji" = left("title_romaji", 255) WHERE length("title_romaji") > 255;
                    ALTER TABLE "work" ALTER COLUMN "title_romaji" TYPE character varying(255);
                END IF;
            END $$;
        `);
    }
}
