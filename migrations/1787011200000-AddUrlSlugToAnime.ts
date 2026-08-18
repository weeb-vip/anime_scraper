import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds anime.url_slug, the public URL segment behind /anime/<slug>.
 *
 * Generated here because postgres is the source of truth; anime-api and
 * anime-sync already have somewhere for the value to land, so the backfill's
 * CDC events populate MySQL without a second pass.
 *
 * Deliberately NOT backfilled in this migration. Updating ~29,600 rows in one
 * transaction emits ~29,600 CDC events at commit, and anime-sync republishes
 * each one to the algolia and image topics. The backfill lives in
 * scripts/backfill-url-slug.sql so it can be run in paced batches.
 */
export class AddUrlSlugToAnime1787011200000 implements MigrationInterface {
    name = 'AddUrlSlugToAnime1787011200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime" ADD "url_slug" character varying(255)`);

        // Unique because it is a URL. Nullable rows do not collide under a
        // unique index in postgres, so rows the backfill has not reached yet
        // sit happily alongside each other.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_anime_url_slug" ON "anime" ("url_slug")`);

        // Lowercase, punctuation to hyphens, trimmed. Immutable so it can be
        // used from an index or a generated expression later if wanted.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION anime_slug_base(title text) RETURNS text AS $$
                SELECT btrim(lower(regexp_replace(coalesce(title, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-')
            $$ LANGUAGE sql IMMUTABLE
        `);

        // Assigns a slug on insert, and only when one is not already set.
        //
        // A slug is never recomputed once assigned. That is the point: a title
        // correction upstream must not silently change a live URL, which would
        // break every existing link and search result pointing at it. The
        // frontend redirects the old id-based URLs; nothing redirects a slug
        // that quietly rewrote itself.
        //
        // The collision checks exclude the row itself. Without that, an upsert
        // that passes a null slug for an existing row would see its own current
        // slug sitting in the table and "resolve" the collision by suffixing --
        // churning a live URL on a no-op save.
        //
        // Disambiguation walks title -> -year -> -year-type -> -type before
        // falling back to an id fragment. Replayed against the full catalogue
        // of 29,634 anime, every row came out unique and the shapes were:
        //
        //   29,362  bare title
        //      136  -year
        //      129  title truncated at 80 characters, no suffix needed
        //        3  -type          (rows with no start_date)
        //        1  -year-type
        //        3  id slug        (titles with no latin characters at all)
        //
        // Nothing reached the id-fragment backstop. It exists for future data,
        // not as something a reader should normally see.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION anime_assign_url_slug() RETURNS trigger AS $$
            DECLARE
                base text;
                candidate text;
                yr text;
                ty text;
            BEGIN
                IF NEW.url_slug IS NOT NULL AND NEW.url_slug <> '' THEN
                    RETURN NEW;
                END IF;

                base := anime_slug_base(coalesce(nullif(NEW.title_en, ''), NEW.title_jp));

                -- A title with no latin characters at all slugifies to nothing;
                -- fall straight through to the id so the row still gets a URL.
                IF base IS NULL OR base = '' THEN
                    NEW.url_slug := 'anime-' || left(replace(NEW.id::text, '-', ''), 12);
                    RETURN NEW;
                END IF;

                -- Cap the base so a long title cannot overflow the column and
                -- hard-fail the insert. Light-novel titles are genuinely this
                -- long: the worst in the current catalogue slugifies to 160
                -- characters, and nothing bounds the source titles. Cut back to
                -- a whole word so the URL does not end mid-syllable; the
                -- disambiguation cascade below absorbs any collision the
                -- truncation introduces.
                IF length(base) > 80 THEN
                    base := btrim(regexp_replace(left(base, 80), '-[^-]*$', ''), '-');
                    IF base = '' THEN
                        base := left(anime_slug_base(coalesce(nullif(NEW.title_en, ''), NEW.title_jp)), 80);
                    END IF;
                END IF;

                candidate := base;
                IF NOT EXISTS (SELECT 1 FROM anime WHERE url_slug = candidate AND id <> NEW.id) THEN
                    NEW.url_slug := candidate;
                    RETURN NEW;
                END IF;

                yr := to_char(NEW.start_date, 'YYYY');
                IF yr IS NOT NULL THEN
                    candidate := base || '-' || yr;
                    IF NOT EXISTS (SELECT 1 FROM anime WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                ty := anime_slug_base(NEW.type);
                IF yr IS NOT NULL AND ty <> '' THEN
                    candidate := base || '-' || yr || '-' || ty;
                    IF NOT EXISTS (SELECT 1 FROM anime WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                -- Type without the year, for the rows that have no start_date.
                -- Without this a dateless collision skips both branches above
                -- and lands on the id fragment, when "legend-of-exorcism-ona"
                -- was available and reads far better.
                IF ty <> '' THEN
                    candidate := base || '-' || ty;
                    IF NOT EXISTS (SELECT 1 FROM anime WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                -- Backstop. Unique by construction, so an insert never fails on
                -- the slug index no matter how contrived the title.
                NEW.url_slug := base || '-' || left(replace(NEW.id::text, '-', ''), 8);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER anime_url_slug_trigger
            BEFORE INSERT OR UPDATE ON "anime"
            FOR EACH ROW EXECUTE FUNCTION anime_assign_url_slug()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS anime_url_slug_trigger ON "anime"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS anime_assign_url_slug()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS anime_slug_base(text)`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_anime_url_slug"`);
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "url_slug"`);
    }
}
