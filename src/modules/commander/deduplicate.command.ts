import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from 'winston'
import { Inject } from '@nestjs/common'
import { AnimeService } from '../anime/anime.service'
import { DeduplicateService } from '../deduplicate/deduplicate.service'

@Command({
  name: 'deduplicate',
  description: 'Deduplicate the data',
})
export class DeduplicateCommand extends CommandRunner {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    private readonly deduplicateService: DeduplicateService,
  ) {
    super()
  }

  async run(passedParam: string[], options?: any): Promise<void> {
    return this.deduplicateService.deduplicate()
  }
}
