import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds work.url_slug, the public URL segment behind /manga/<slug>.
 *
 * The same treatment anime.url_slug got, and for the same reasons -- see
 * migration 1787011200000, whose comments explain why a slug is assigned once
 * and never recomputed.
 *
 * One difference worth knowing: no backfill. anime.url_slug had to be filled in
 * paced batches because updating 29,600 existing rows in one transaction emits
 * 29,600 CDC events at commit, and anime-sync republishes each to the algolia
 * and image subjects. `work` is empty, so every row that will ever exist gets
 * its slug from the trigger on insert.
 */
export class AddUrlSlugToWork1787356800000 implements MigrationInterface {
    name = 'AddUrlSlugToWork1787356800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work" ADD "url_slug" character varying(255)`);

        // Unique because it is a URL. Nullable rows do not collide under a
        // unique index in postgres, so a row inserted before the trigger
        // existed would not block others.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_work_url_slug" ON "work" ("url_slug")`);

        // anime_slug_base is reused rather than copied. It takes a title and
        // returns a slug and knows nothing about anime despite the name; a
        // second identical function would be duplication with two places to fix
        // the day the slug rules change.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION work_assign_url_slug() RETURNS trigger AS $$
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

                -- A title with no latin characters slugifies to nothing; fall
                -- through to the id so the row still gets a URL.
                IF base IS NULL OR base = '' THEN
                    NEW.url_slug := 'manga-' || left(replace(NEW.id::text, '-', ''), 12);
                    RETURN NEW;
                END IF;

                -- Cap the base so a long title cannot overflow the column.
                -- Light novel titles are the reason this exists on anime and
                -- they are, if anything, worse here: this table is where the
                -- light novels themselves live.
                IF length(base) > 80 THEN
                    base := btrim(regexp_replace(left(base, 80), '-[^-]*$', ''), '-');
                    IF base = '' THEN
                        base := left(anime_slug_base(coalesce(nullif(NEW.title_en, ''), NEW.title_jp)), 80);
                    END IF;
                END IF;

                candidate := base;
                IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                    NEW.url_slug := candidate;
                    RETURN NEW;
                END IF;

                -- Year from publication rather than airing. A manga and the
                -- anime adapting it share a title and would otherwise want the
                -- same slug; they are in different tables and different URL
                -- namespaces, so that is fine, but two manga with one title are
                -- separated the same way two anime are.
                yr := to_char(NEW.published_from, 'YYYY');
                IF yr IS NOT NULL THEN
                    candidate := base || '-' || yr;
                    IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                -- The type is genuinely discriminating here in a way it is not
                -- for anime: a story routinely exists as both a light novel and
                -- a manga under one title, and those are two rows in this table.
                ty := anime_slug_base(NEW.type);
                IF yr IS NOT NULL AND ty <> '' THEN
                    candidate := base || '-' || yr || '-' || ty;
                    IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                IF ty <> '' THEN
                    candidate := base || '-' || ty;
                    IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

                -- Backstop. Unique by construction, so an insert never fails on
                -- the slug index however contrived the title.
                NEW.url_slug := base || '-' || left(replace(NEW.id::text, '-', ''), 8);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER work_url_slug_trigger
            BEFORE INSERT OR UPDATE ON "work"
            FOR EACH ROW EXECUTE FUNCTION work_assign_url_slug()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS work_url_slug_trigger ON "work"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS work_assign_url_slug()`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_url_slug"`);
        await queryRunner.query(`ALTER TABLE "work" DROP COLUMN "url_slug"`);
    }
}
