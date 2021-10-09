export interface IUsage {
  readonly cpu: number
  readonly memory: number
}

export interface IAppState {
  readonly version: string

  readonly app?: {
    readonly ready: number
  }

  readonly usage?: IUsage
}
