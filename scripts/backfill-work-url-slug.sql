-- One batch of the work.url_slug backfill.
--
-- The work counterpart of backfill-url-slug.sql, and it works the same way:
-- setting url_slug to NULL is what does it, because the BEFORE UPDATE trigger
-- sees a null slug and assigns one. Nothing else about the row changes.
--
-- The difference is the WHERE clause. The anime backfill filled in rows that
-- had no slug at all; every work already has one. The rows this targets are
-- the ones the trigger could only give a uuid to -- 'manga-5191f659b9f7' --
-- because at insert time the work's only name was in kana and slugified to the
-- empty string. That was not a bug in the trigger but missing data: the
-- scraper was reading the manga heading through the anime page's selector and
-- dropping the romanised title on every page. With title_en now populated,
-- those same rows slugify to 'vista-da-gigantessa'.
--
-- Hence the second condition. A row whose title still slugifies to nothing
-- would be handed straight back to the uuid branch, and without the guard this
-- loop would rewrite it every pass and never terminate. Only rows that will
-- actually come out better are touched.
--
-- Re-slugging is a deliberate exception to "assigned once and never
-- rewritten". That rule protects public URLs, and it is worth breaking exactly
-- here: nothing meaningful links to a uuid slug, and leaving 44,591 works on
-- unreadable URLs is the larger harm. It is safe to run more than once -- rows
-- already given a real slug no longer match -- which is what makes it usable
-- while the re-scrape is still landing titles.
--
-- Deliberately a single batch rather than a loop, for the same reason as the
-- anime version: wrapping the whole backfill in one transaction would emit
-- every CDC event at commit no matter how it was batched internally. Pacing
-- has to happen between transactions, which is what backfill-work-url-slug.sh
-- does.
--
-- FOR UPDATE SKIP LOCKED so a run does not fight the scraper for rows.

\set batch_size 500

WITH batch AS (
    SELECT id FROM work
    WHERE url_slug ~ '^manga-[0-9a-f]{12}$'
      AND anime_slug_base(coalesce(nullif(title_en, ''), nullif(title_romaji, ''), title_jp)) <> ''
    ORDER BY id
    LIMIT :batch_size
    FOR UPDATE SKIP LOCKED
)
UPDATE work w SET url_slug = NULL
FROM batch b WHERE w.id = b.id;

SELECT count(*) AS remaining FROM work
WHERE url_slug ~ '^manga-[0-9a-f]{12}$'
  AND anime_slug_base(coalesce(nullif(title_en, ''), nullif(title_romaji, ''), title_jp)) <> '';
