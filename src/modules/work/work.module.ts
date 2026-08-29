import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkRepository } from './repository/work.repository'
import { WorkService } from './work.service'

@Module({
  imports: [TypeOrmModule.forFeature([WorkRepository])],
  providers: [WorkService],
  exports: [WorkService, TypeOrmModule],
})
export class WorkModule {}
