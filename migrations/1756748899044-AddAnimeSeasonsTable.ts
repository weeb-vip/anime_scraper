import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAnimeSeasonsTable1756748899044 implements MigrationInterface {
    name = 'AddAnimeSeasonsTable1756748899044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."anime_seasons_status_enum" AS ENUM('new', 'continuing', 'final', 'unknown')`);
        await queryRunner.query(`CREATE TABLE "anime_seasons" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "season" character varying NOT NULL,
            "status" "public"."anime_seasons_status_enum" NOT NULL DEFAULT 'unknown',
            "episode_count" integer,
            "notes" text,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "anime_id" uuid,
            CONSTRAINT "UQ_anime_season" UNIQUE ("anime_id", "season"),
            CONSTRAINT "PK_anime_seasons" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_season" ON "anime_seasons" ("season") `);
        await queryRunner.query(`CREATE INDEX "IDX_status" ON "anime_seasons" ("status") `);
        await queryRunner.query(`ALTER TABLE "anime_seasons" ADD CONSTRAINT "FK_anime_seasons_anime_id" FOREIGN KEY ("anime_id") REFERENCES "anime"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anime_seasons" DROP CONSTRAINT "FK_anime_seasons_anime_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_season"`);
        await queryRunner.query(`DROP TABLE "anime_seasons"`);
        await queryRunner.query(`DROP TYPE "public"."anime_seasons_status_enum"`);
    }

}
