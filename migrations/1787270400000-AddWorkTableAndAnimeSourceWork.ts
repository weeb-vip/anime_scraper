import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds `work` -- the manga, light novels and novels anime are adapted from --
 * and `anime.source_work_id` pointing at it.
 *
 * See docs/manga-and-works.md for why this is one table rather than `manga` +
 * `light_novel` + ..., and why it is a sibling of `anime` rather than a merge
 * into a shared `items` table. In short: MAL serves the whole manga family from
 * one namespace at /manga/<id> with a `Type` field, and the fields are
 * effectively identical across those types, while anime and works genuinely
 * differ in shape.
 *
 * The point of it is that `anime.source` records a category, never an identity.
 * We know 6,110 anime came from a manga and cannot say which one, so
 * re-adaptations of the same source -- Fruits Basket 2001 and 2019, Hunter x
 * Hunter 1999 and 2011 -- look unrelated. They share no TheTVDB id and often no
 * cast, so both existing relation signals miss them.
 */
export class AddWorkTableAndAnimeSourceWork1787270400000 implements MigrationInterface {
    name = 'AddWorkTableAndAnimeSourceWork1787270400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "work" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "mal_id" integer,
                "type" character varying(32) NOT NULL DEFAULT 'MANGA',
                "title_en" character varying(255),
                "title_jp" character varying(255),
                "title_synonyms" text,
                "synopsis" text,
                "image_url" character varying(512),
                "status" character varying(64),
                "volumes" integer,
                "chapters" integer,
                "published_from" TIMESTAMP WITH TIME ZONE,
                "published_to" TIMESTAMP WITH TIME ZONE,
                "demographic" character varying(64),
                "serialization" character varying(255),
                "authors" text,
                "score" numeric(4,2),
                "ranking" integer,
                "members" integer,
                "favorites" integer,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_work_id" PRIMARY KEY ("id")
            )
        `);

        // One MAL manga id is one work. Unique so a re-scrape updates rather
        // than duplicating -- the same mistake myanimelist_link made by keying
        // on a title that MAL rewrites freely, which cost 486 duplicate rows.
        //
        // Nullable and unique coexist in postgres: works from a source other
        // than MAL can arrive without an id and will not collide.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_work_mal_id" ON "work" ("mal_id")`);

        // The catalogue is browsed and counted by type far more than by
        // anything else here.
        await queryRunner.query(`CREATE INDEX "IDX_work_type" ON "work" ("type")`);

        // One column rather than a link table. An anime adapting several works
        // exists but is rare enough that the join table can wait until there is
        // a case that needs it; adding it later does not invalidate this column.
        await queryRunner.query(`ALTER TABLE "anime" ADD "source_work_id" uuid`);

        // The lookup runs in both directions: an anime's source, and every anime
        // adapted from one work -- which is the whole point, since that set is
        // what relates re-adaptations to each other.
        await queryRunner.query(`CREATE INDEX "IDX_anime_source_work_id" ON "anime" ("source_work_id")`);

        // Deliberately no foreign key.
        //
        // Scrape order is not dependency order. An anime page is parsed before
        // the manga it names has ever been fetched, and step 6 of the plan
        // stores that relation unresolved in myanimelist_link precisely so it
        // can be filled in whenever the other side arrives. A constraint here
        // would reject exactly the writes the design expects, and the read
        // store already learned this lesson from the other direction: CDC makes
        // no ordering promise across tables, and anime-sync had to start
        // discarding foreign key violations because an episode routinely
        // arrives before its anime.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_anime_source_work_id"`);
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "source_work_id"`);
        await queryRunner.query(`DROP INDEX "IDX_work_type"`);
        await queryRunner.query(`DROP INDEX "IDX_work_mal_id"`);
        await queryRunner.query(`DROP TABLE "work"`);
    }
}
