#!/usr/bin/env bash
# Backfill anime.thetvdbid from the AniDB/MAL -> TheTVDB mapping, in paced batches.
#
# Each batch is its own transaction, so CDC emits its events as the batch commits
# rather than all at once. anime-sync republishes every anime update to the
# algolia and image topics, so an unpaced backfill would fire that many re-index
# operations and image messages -- and each newly-linked show also becomes a
# thetvdb-enrichment fetch, so the burst lands on TheTVDB's API too.
#
# Usage:
#   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=anime ./backfill-thetvdbid.sh [pause_seconds]
#   PGHOST=... ... ./backfill-thetvdbid.sh --dry-run     # counts only, writes nothing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY=0
[ "${1:-}" = "--dry-run" ] && { DRY=1; shift; }
PAUSE="${1:-2}"

psql -v ON_ERROR_STOP=1 -q <<EOSQL
CREATE TABLE IF NOT EXISTS thetvdb_id_map (
  anidbid text, mal_id text, thetvdb_id text
);
TRUNCATE thetvdb_id_map;
\copy thetvdb_id_map FROM '${SCRIPT_DIR}/thetvdb-id-map.csv' WITH (FORMAT csv, HEADER true)
CREATE INDEX IF NOT EXISTS thetvdb_id_map_anidbid_idx ON thetvdb_id_map (anidbid);
CREATE INDEX IF NOT EXISTS thetvdb_id_map_mal_idx     ON thetvdb_id_map (mal_id);
EOSQL

psql -v ON_ERROR_STOP=1 -q -c "\
SELECT 'anime total' AS metric, count(*)::text AS value FROM anime \
UNION ALL SELECT 'already has thetvdbid', count(*)::text FROM anime WHERE thetvdbid IS NOT NULL AND thetvdbid <> '' \
UNION ALL SELECT 'WILL FILL', count(*)::text FROM anime a \
  LEFT JOIN thetvdb_id_map ma ON ma.anidbid <> '' AND ma.anidbid = a.anidbid \
  LEFT JOIN thetvdb_id_map mm ON mm.mal_id  <> '' AND mm.mal_id  = a.mal_id::text \
  WHERE (a.thetvdbid IS NULL OR a.thetvdbid = '') AND COALESCE(ma.thetvdb_id, mm.thetvdb_id) IS NOT NULL;"

if [ "$DRY" = "1" ]; then
    echo "dry run - nothing written"
    psql -v ON_ERROR_STOP=1 -q -c "DROP TABLE IF EXISTS thetvdb_id_map;"
    exit 0
fi

while :; do
    remaining=$(psql -v ON_ERROR_STOP=1 -t -A -f "${SCRIPT_DIR}/backfill-thetvdbid.sql" | tail -1)
    echo "$(date -u +%H:%M:%S)  remaining: ${remaining}"
    [ "${remaining}" = "0" ] && break
    sleep "${PAUSE}"
done

psql -v ON_ERROR_STOP=1 -q -c "DROP TABLE IF EXISTS thetvdb_id_map;"
echo "backfill complete"
