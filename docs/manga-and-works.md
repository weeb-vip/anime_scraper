# Manga, light novels, and source works

Plan for scraping the works anime are adapted from, and using them to relate
anime to each other. Written 2026-08-22, paused before implementation.

## Why

Anime adaptations of the same source are invisible to us today.

```
Fruits Basket        2001  and  2019
Hunter x Hunter      1999  and  2011
Fullmetal Alchemist  2003  and  Brotherhood
```

Those share no TheTVDB series id and frequently no voice cast, so neither
signal behind `Anime.relatedAnime` finds them. The manga is the only thing
connecting them.

`anime.source` cannot help: it records a *category*, not an identity.

```
Original      13,334      Manga   6,110      Light novel  1,362
Unknown        2,956      Game    1,665      Web manga      831
Novel            808      Web novel 470      4-koma         368
```

We know an anime came from a manga. We never know *which* manga.

## Decisions already made

These were reasoned through with evidence. Recorded so they don't get
relitigated, not because they can't change.

### One `work` table, not `manga` + `light_novel` + ...

MAL serves manga and light novels from **one namespace** — both live at
`myanimelist.net/manga/<id>` — with a `Type` field distinguishing Manga, Light
Novel, Novel, One-shot, Doujinshi, Manhwa, Manhua. Compared field-by-field:

```
Manga (Vinland Saga)        Light Novel (Spice & Wolf)
  Volumes, Chapters           Volumes, Chapters
  Status, Published           Status, Published
  Genres, Theme               Genres, Themes
  Demographic                 -
  Serialization, Authors      Serialization, Authors
  Score, Ranked, Popularity   Score, Ranked, Popularity
```

Effectively identical. The only divergence is `Demographic`. One table with a
`type` column, one scraper path, one page parser.

### `work` is a sibling of `anime`, not a merge into `items`

Anime and works differ in **shape**, not just label:

```
anime only:  episodes, episode_count, broadcast, duration/ep, season,
             studios, licensors, thetvdbid, anidbid, streaming, air times
work only:   chapters, volumes, published_from/to, serialization, authors
shared:      titles, synopsis, image, score, ranking, mal_id, tags, characters
```

Merging them means half the columns NULL on every row, `WHERE type='anime'` on
every query, the already-optimised airing query scanning ~70k manga rows, and
the `anime_episode_count` triggers needing type guards. The blast radius is
**54 `anime_id` references across migrations**, plus `user_anime` in
user-service and list-service.

The rule: **split on shape, discriminate on label.** MAL's manga family is one
shape wearing several labels. A visual novel from VNDB would be a second shape
— that is when a per-type detail table earns its keep, and the model stays open
to it.

### `myanimelist_link` needs a generic target

```sql
myanimelist_link(type, name, link, anime_id)
                                   ^^^^^^^^
```

`RECORD_TYPE` has carried `{ Anime, Manga, Character, Staff, Studio, User }`
since the table was created and only ever held `anime`, because `anime_id` is
the only foreign key. A manga link has a type to declare and nowhere to point.

This matters beyond manga: this table is how a scraped MAL URL becomes one of
our ids, and it is what lets us record a relationship to something not yet
scraped — store the URL now, resolve when the other side arrives. Without a
generic target, cross-record links are dropped at write time and never
recovered.

Not CDC'd (no `myanimelist_link` table exists in MySQL), so changing it has no
downstream blast radius.

## Open decision: get off Vitess first

**Preference stated: move to Postgres, off PlanetScale/Vitess.** Migrations are
materially easier there, and today gave concrete examples:

- **No foreign keys.** `000032_create_tags_table` says so in a comment —
  "Foreign keys not used due to Vitess/PlanetScale compatibility".
- **`migrate up` cannot build a database from scratch.** An earlier migration
  uses `DELIMITER`, which golang-migrate cannot parse, so the chain dies
  partway. New environments cannot be bootstrapped from migrations alone.
- **Accent folding by hand.** `000038_add_url_slug_to_anime_staff` needed a
  ~40-branch nested `REPLACE` chain to fold accents in a generated column.
  Postgres does that with `unaccent()`.

This changes the manga sequencing, because building `work` under the current
architecture means building it **twice**:

```
today:      Postgres table -> Debezium topic -> sync consumer command
            -> MySQL migration -> reconcileTables entry -> anime-api repository
Postgres:   Postgres table -> anime-api repository
```

Every table added before the move is pipeline work that gets thrown away. And
`work` is not one table for long — characters, authors, and relations follow.

### Suggested approach: strangler, not big bang

Do not block manga behind a full MySQL to Postgres migration, and do not build
manga on MySQL. Instead:

1. `work` lives in Postgres and **anime-api reads it directly**, skipping CDC
   entirely.
2. `anime` keeps reading MySQL as today.
3. The join is application-level and cheap: `anime.source_work_id` lives on the
   anime row in MySQL, so "this anime's source" is one Postgres lookup by id,
   and "anime adapting this work" is one MySQL query by `source_work_id`.

This proves the Postgres-direct read path on a new, low-traffic entity family
before touching the load-bearing anime path. If it works, migrate anime after.
If it does not, little is lost.

Cost to weigh: anime-api holds two database connections for a period, and one
service reading two stores is a real complexity. Bounded, and temporary if the
full move follows.

**Counter-argument worth keeping honest:** prod MySQL is PlanetScale, a managed
service, and is one of the few components in this stack that has not caused
trouble. In-cluster Postgres on seven nodes that have had memory pressure and a
`NodeNotReady` is a different risk profile. The strangler order matters partly
because it lets that be evaluated on `work` before it is bet on `anime`.

## Scope of the payoff

MAL's manga database covers the manga-family sources only:

```
reachable:    Manga 6,110 + Light novel 1,362 + Web manga 831 + Novel 808
              + Web novel 470 + 4-koma 368            ~= 10,300 anime
not on MAL:   Game 1,665 + Visual novel 1,212         (needs VNDB/IGDB)
no source:    Original 13,334                          (cannot participate)
```

So roughly a third of the catalogue gains source-work relations. That is still
every re-adaptation case, which nothing else reaches.

## Steps

Ordered. Nothing after step 1 is started.

1. **`myanimelist_link.record_id`** — drafted, uncommitted, on branch
   `feat/work-table`:
   `migrations/1787184000000-GeneralizeMyanimelistLinkRecordId.ts`.
   Adds `record_id`, backfills from `anime_id`, indexes `(link)` uniquely and
   `(type, record_id)`. Leaves `anime_id` in place so the migration and the
   code change can deploy independently; drop it in a follow-up.

2. **Entity and repository** — `MyanimelistLinks.recordId`, and resolution
   helpers that take a `RECORD_TYPE`.

3. **`work` table** in Postgres:

   ```
   work(id, mal_id, type, title_en, title_jp, title_synonyms, synopsis,
        image_url, status, volumes, chapters, published_from, published_to,
        demographic, serialization, authors, score, ranking, members,
        favorites, created_at, updated_at)
   ```

   `type` in `{ MANGA, LIGHT_NOVEL, NOVEL, WEB_MANGA, ONE_SHOT, DOUJINSHI,
   MANHWA, MANHUA }`. Note `authors` as a JSON-ish text column follows the
   existing `studios`/`genres` convention. That convention is known to be
   dirty -- 41% of `anime.studios` is the literal placeholder
   `["None found"," add some"]`, and a comma-split bug made `" Inc."` a studio
   with 19 anime -- so normalising `authors` the way genres became `tags`
   is worth doing at creation rather than later.

4. **`anime.source_work_id`** — nullable, indexed. One column covers the
   overwhelming majority; an anime adapting several works is rare enough to
   defer a link table.

5. **Scraper: MAL manga pages.** Same Puppeteer cluster, session and captcha
   handling as the anime path. Parse the sidebar labels listed above.

6. **Scraper: capture the source link on anime pages.** Store the MAL URL
   unresolved, resolve later via `myanimelist_link` — the same pattern that
   makes relations recoverable.

7. **Read path** — per the strangler decision above.

8. **`AnimeRelation.SHARED_SOURCE`** in anime-api. The enum already exists and
   documents this gap; adding a value is non-breaking, and the frontend already
   groups by relation kind and falls back for unknown kinds.

## Things deliberately not decided

- **Characters shared between an anime and its manga.** `anime_character` is
  keyed `(anime_id, name)` — per-work rows, not per-character. Manga characters
  need either a parallel table or a real `character` + `appearance` model. Real
  question, separate from this one.
- **Renaming `anime-api`.** Serving works from a service called anime-api makes
  the name a lie. Renaming touches Argo apps, subgraph registration and DNS.
  Accepted as historical for now.
- **Work slugs.** `/manga/<slug>` will want the same treatment `anime.url_slug`
  got. Not needed until works have pages.
