import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveSeasonFromAnime1756749468921 implements MigrationInterface {
    name = 'RemoveSeasonFromAnime1756749468921'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Before removing the column, optionally migrate existing data to anime_seasons table
        // This query will move any existing season data to the new anime_seasons table
        await queryRunner.query(`
            INSERT INTO anime_seasons (anime_id, season, status, created_at, updated_at)
            SELECT id, season, 'unknown', NOW(), NOW()
            FROM anime 
            WHERE season IS NOT NULL
            ON CONFLICT (anime_id, season) DO NOTHING
        `);

        // Remove the season column from anime table
        await queryRunner.query(`ALTER TABLE "anime" DROP COLUMN "season"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the season column
        await queryRunner.query(`ALTER TABLE "anime" ADD "season" character varying`);
        
        // Optionally restore data from anime_seasons table (taking the first/latest season)
        await queryRunner.query(`
            UPDATE anime 
            SET season = (
                SELECT season 
                FROM anime_seasons 
                WHERE anime_seasons.anime_id = anime.id 
                ORDER BY created_at DESC 
                LIMIT 1
            )
        `);
    }

}
