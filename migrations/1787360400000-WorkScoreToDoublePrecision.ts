import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Changes work.score from numeric(4,2) to double precision.
 *
 * Not a modelling preference -- numeric is the better type for a score, and if
 * this table were read only by SQL it would stay. The problem is what Debezium
 * does with it.
 *
 * Debezium's decimal.handling.mode defaults to `precise`, which encodes numeric
 * columns as base64 bytes plus a scale from the schema rather than as a JSON
 * number. A consumer unmarshalling into *float64 does not get 8.82; it gets a
 * decode error, or worse, silence. work.score is the only numeric column in
 * this entire schema, so nothing has hit this before and nothing else changes
 * if it moves.
 *
 * The alternative was setting decimal.handling.mode=double on the connector,
 * which is a change to every table it captures and needs the connector
 * restarted, to fix one column that has no rows yet. This is the smaller blast
 * radius by a wide margin.
 *
 * float8 holds a two-decimal score exactly well enough: MAL publishes one
 * decimal place of real precision (8.82 is already a rounded mean of millions
 * of votes) and nothing arithmetic is done with it downstream.
 */
export class WorkScoreToDoublePrecision1787360400000 implements MigrationInterface {
    name = 'WorkScoreToDoublePrecision1787360400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // No USING clause needed: numeric to double precision is an assignment
        // cast, and the table is empty regardless.
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "score" TYPE double precision`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work" ALTER COLUMN "score" TYPE numeric(4,2)`);
    }
}
