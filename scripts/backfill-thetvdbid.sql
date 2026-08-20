-- One batch of the thetvdbid backfill.
--
-- Source is scripts/thetvdb-id-map.csv (AniDB/MAL -> TheTVDB, from
-- Fribb/anime-lists), loaded into thetvdb_id_map by backfill-thetvdbid.sh.
--
-- Writes anime.thetvdbid directly rather than going through the link table and
-- syncIDs. syncIDs loops every link with no pacing, which would emit one anime
-- update per row at once -- the exact burst backfill-url-slug.sh exists to
-- avoid, since anime-sync republishes each anime update to the algolia and
-- image topics. Here one batch is one transaction, so CDC drains per batch.
--
-- Deliberately a single batch rather than a loop: pacing has to happen between
-- transactions, which is what backfill-thetvdbid.sh does.
--
-- Joins anidbid first, falling back to mal_id: 250 mappings carry an anidb_id
-- with no mal_id, and none the other way round.
--
-- FOR UPDATE SKIP LOCKED so a run does not fight the scraper for rows.

\set batch_size 500

WITH batch AS (
    SELECT a.id,
           COALESCE(ma.thetvdb_id, mm.thetvdb_id) AS thetvdb_id
    FROM anime a
    LEFT JOIN thetvdb_id_map ma ON ma.anidbid <> '' AND ma.anidbid = a.anidbid
    LEFT JOIN thetvdb_id_map mm ON mm.mal_id  <> '' AND mm.mal_id  = a.mal_id::text
    WHERE (a.thetvdbid IS NULL OR a.thetvdbid = '')
      AND COALESCE(ma.thetvdb_id, mm.thetvdb_id) IS NOT NULL
    ORDER BY a.id
    LIMIT :batch_size
    FOR UPDATE OF a SKIP LOCKED
)
UPDATE anime a SET thetvdbid = b.thetvdb_id
FROM batch b WHERE a.id = b.id;

SELECT count(*) AS remaining
FROM anime a
LEFT JOIN thetvdb_id_map ma ON ma.anidbid <> '' AND ma.anidbid = a.anidbid
LEFT JOIN thetvdb_id_map mm ON mm.mal_id  <> '' AND mm.mal_id  = a.mal_id::text
WHERE (a.thetvdbid IS NULL OR a.thetvdbid = '')
  AND COALESCE(ma.thetvdb_id, mm.thetvdb_id) IS NOT NULL;
