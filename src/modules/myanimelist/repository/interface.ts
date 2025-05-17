export interface IMyanimelist {
  readonly id: number
  readonly type: RECORD_TYPE
  readonly name: string
  readonly link: string
  readonly animeId: string
  readonly updatedAt: Date
}

export enum RECORD_TYPE {
  Anime = 'anime',
  Manga = 'manga',
  Character = 'character',
  Staff = 'staff',
  Studio = 'studio',
  User = 'user',
}
