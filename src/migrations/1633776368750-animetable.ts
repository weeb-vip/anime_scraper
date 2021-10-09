import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class animetable1633776368750 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'anime',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title_en',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'title_jp',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'title_romaji',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'title_kanji',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'title_synonyms',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'synopsis',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'episodes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'genres',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'broadcast',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'licensors',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'studios',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('anime')
  }
}
