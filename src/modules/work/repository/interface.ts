// The manga family as MAL models it: one namespace at /manga/<id>, with a Type
// field telling the kinds apart. They are one shape wearing several labels --
// the fields are identical across them apart from Demographic -- so they are
// one table discriminated by this, rather than a table each.
//
// A visual novel from VNDB would be a genuinely different shape. That is when a
// per-type detail table earns its keep, and this model stays open to it.
export enum WORK_TYPE {
  Manga = 'MANGA',
  LightNovel = 'LIGHT_NOVEL',
  Novel = 'NOVEL',
  WebManga = 'WEB_MANGA',
  WebNovel = 'WEB_NOVEL',
  OneShot = 'ONE_SHOT',
  Doujinshi = 'DOUJINSHI',
  Manhwa = 'MANHWA',
  Manhua = 'MANHUA',
  FourKoma = 'FOUR_KOMA',
}

export interface IWork {
  readonly id: string
  readonly malId: number
  readonly type: WORK_TYPE
  readonly urlSlug: string
  readonly titleEn: string
  readonly titleRomaji: string
  readonly titleJp: string
  readonly titleSynonyms: string[]
  readonly synopsis: string
  readonly imageUrl: string
  readonly status: string
  readonly volumes: number
  readonly chapters: number
  readonly publishedFrom: Date | null
  readonly publishedTo: Date | null
  readonly demographic: string
  readonly serialization: string
  readonly authors: string[]
  readonly score: number
  readonly ranking: number
  readonly members: number
  readonly favorites: number
  readonly createdAt: Date
  readonly updatedAt: Date
}
