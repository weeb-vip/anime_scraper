#!/usr/bin/env bash
# Backfill anime.url_slug in paced batches.
#
# Each batch is its own transaction, so CDC emits its events as the batch
# commits rather than all at once. That matters: anime-sync republishes every
# anime update to the algolia and image topics, so an unpaced backfill of
# ~29,600 rows would fire that many re-index operations and image messages in
# one burst.
#
# Usage:
#   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=anime ./backfill-url-slug.sh [pause_seconds]
set -euo pipefail

PAUSE="${1:-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while :; do
    remaining=$(psql -v ON_ERROR_STOP=1 -t -A -f "${SCRIPT_DIR}/backfill-url-slug.sql" | tail -1)
    echo "$(date -u +%H:%M:%S)  remaining: ${remaining}"
    [ "${remaining}" = "0" ] && break
    sleep "${PAUSE}"
done

echo "backfill complete"
