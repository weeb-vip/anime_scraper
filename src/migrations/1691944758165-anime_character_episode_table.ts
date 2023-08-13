import { MigrationInterface, QueryRunner } from 'typeorm'

export class animeCharacterEpisodeTable1691944758165
  implements MigrationInterface
{
  name = 'animeCharacterEpisodeTable1691944758165'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "anime_character" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "anime_id" character varying NOT NULL, "name" character varying NOT NULL, "role" character varying NOT NULL, "birthday" character varying, "zodiac" character varying, "gender" character varying, "race" character varying, "height" character varying, "weight" character varying, "title" character varying, "martial_status" character varying, "summary" character varying, CONSTRAINT "PK_4ade0f9733454606085cb0b43a0" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "anime_episodes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "anime_id" character varying NOT NULL, "episode" integer NOT NULL, "title" character varying, "aired" character varying, "synopsis" character varying, CONSTRAINT "PK_cfded8ca0fc506bba0ecfab421f" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "anime_episodes"`)
    await queryRunner.query(`DROP TABLE "anime_character"`)
  }
}
