-- One batch of the url_slug backfill.
--
-- Setting url_slug to NULL is what does the work: the BEFORE UPDATE trigger
-- sees a null slug and assigns one. Nothing else about the row changes.
--
-- Deliberately a single batch rather than a loop. Wrapping the whole backfill
-- in one transaction -- or one DO block, which is the same thing -- would emit
-- every CDC event at commit no matter how it was batched internally. Pacing
-- has to happen between transactions, which is what backfill-url-slug.sh does.
--
-- FOR UPDATE SKIP LOCKED so a run does not fight the scraper for rows.

\set batch_size 500

WITH batch AS (
    SELECT id FROM anime
    WHERE url_slug IS NULL
    ORDER BY id
    LIMIT :batch_size
    FOR UPDATE SKIP LOCKED
)
UPDATE anime a SET url_slug = NULL
FROM batch b WHERE a.id = b.id;

SELECT count(*) AS remaining FROM anime WHERE url_slug IS NULL;
