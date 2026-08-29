import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IWork, WORK_TYPE } from './repository/interface'
import { WorkRepository } from './repository/work.repository'
import { Work } from './repository/work.entity'

@Injectable()
export class WorkService {
  constructor(
    @InjectRepository(WorkRepository)
    private readonly workRepository: WorkRepository,
  ) {}

  upsertWork(work: Partial<Work>): Promise<IWork> {
    return this.workRepository.upsert(work)
  }

  findByMalId(malId: number): Promise<IWork> {
    return this.workRepository.findOneByMalId(malId)
  }

  findById(id: string): Promise<IWork> {
    return this.workRepository.findOneById(id)
  }

  findAllByType(type: WORK_TYPE): Promise<IWork[]> {
    return this.workRepository.findAllByType(type)
  }
}
