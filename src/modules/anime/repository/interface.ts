export interface IAnime {
  id: string

  anidbid: string
  mal_id?: number
  type: RECORD_TYPE
  title_en: string
  title_jp: string
  title_romaji: string
  title_kanji: string
  title_synonyms: string[]
  image_url: string
  synopsis: string
  episodes: number
  status: string
  startDate: Date
  endDate: Date
  genres: string[]
  duration: string
  broadcast: string
  source: string
  licensors: string[]
  studios: string[]
  rating: string
  ranking: number
  // The work this anime adapts, when known. Null for originals and for sources
  // MAL's manga database does not cover -- which is most of the catalogue.
  source_work_id: string
  createdAt: Date
  updatedAt: Date
}

export enum RECORD_TYPE {
  Anime = 'anime',
  Manga = 'manga',
  Character = 'character',
  Staff = 'staff',
  Studio = 'studio',
  User = 'user',
}
