import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds work.title_romaji, and teaches the slug trigger to use it.
 *
 * MAL gives a manga page three names, not two: the sidebar's "English:" row,
 * the sidebar's "Japanese:" row, and the romanised name in the page heading --
 * "Vista Da Gigantessa" over ビスタ・ダ・ギガンテッサ. Only the heading is
 * always present. English is absent on 65% of the catalogue, because most of
 * it was never licensed.
 *
 * The scraper had been reading the heading through the anime page's selector,
 * `.title-name.h1_bold_none`, which does not exist on a manga page. So the
 * romanised name was silently dropped on every manga ever scraped, and the
 * 53,193 works with no English title were left with a Japanese title as their
 * only name. That is what put 44,547 of them on `manga-<uuid>` URLs -- a title
 * in kana slugifies to the empty string -- and what makes them unfindable by
 * any latin-script search.
 *
 * Romaji goes in its own column rather than into title_en. They are not the
 * same claim: "Karakai Jouzu no Takagi-san" is the romanised Japanese and
 * "Teasing Master Takagi-san" is the English, and a row can legitimately have
 * both. `anime` already models it this way; `work` was the one missing it.
 *
 * NO SLUG BACKFILL HERE, deliberately. Existing rows keep the slugs they have:
 * a slug is a public URL and is assigned once, per migration 1787011200000.
 * Minting better ones for the 44,547 uuid-slug rows is a separate, paced job --
 * rewriting them in one transaction would emit 44,547 CDC events at commit and
 * anime-sync republishes each to the algolia and image subjects. That is what
 * scripts/backfill-url-slug.sh exists to pace, and it needs the romaji values
 * scraped in before it has anything better to offer.
 */
export class AddTitleRomajiToWork1787443200000 implements MigrationInterface {
    name = 'AddTitleRomajiToWork1787443200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work" ADD "title_romaji" character varying(255)`);

        // Only the coalesce changes; the rest is migration 1787356800000's
        // function verbatim, since CREATE OR REPLACE has to restate the whole
        // body. Romaji sits between English and Japanese: prefer a real English
        // title when MAL has one, fall back to the romanisation, and reach the
        // Japanese title only when neither exists -- where it still slugifies
        // to nothing and still lands on the uuid, which is correct.
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

                base := anime_slug_base(coalesce(nullif(NEW.title_en, ''), nullif(NEW.title_romaji, ''), NEW.title_jp));

                IF base IS NULL OR base = '' THEN
                    NEW.url_slug := 'manga-' || left(replace(NEW.id::text, '-', ''), 12);
                    RETURN NEW;
                END IF;

                IF length(base) > 80 THEN
                    base := btrim(regexp_replace(left(base, 80), '-[^-]*$', ''), '-');
                    IF base = '' THEN
                        base := left(anime_slug_base(coalesce(nullif(NEW.title_en, ''), nullif(NEW.title_romaji, ''), NEW.title_jp)), 80);
                    END IF;
                END IF;

                candidate := base;
                IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                    NEW.url_slug := candidate;
                    RETURN NEW;
                END IF;

                yr := to_char(NEW.published_from, 'YYYY');
                IF yr IS NOT NULL THEN
                    candidate := base || '-' || yr;
                    IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

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

                NEW.url_slug := base || '-' || left(replace(NEW.id::text, '-', ''), 8);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore the two-name coalesce before dropping the column the new one
        // reads, or the trigger breaks on the next insert.
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

                IF base IS NULL OR base = '' THEN
                    NEW.url_slug := 'manga-' || left(replace(NEW.id::text, '-', ''), 12);
                    RETURN NEW;
                END IF;

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

                yr := to_char(NEW.published_from, 'YYYY');
                IF yr IS NOT NULL THEN
                    candidate := base || '-' || yr;
                    IF NOT EXISTS (SELECT 1 FROM "work" WHERE url_slug = candidate AND id <> NEW.id) THEN
                        NEW.url_slug := candidate;
                        RETURN NEW;
                    END IF;
                END IF;

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

                NEW.url_slug := base || '-' || left(replace(NEW.id::text, '-', ''), 8);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`ALTER TABLE "work" DROP COLUMN "title_romaji"`);
    }
}
