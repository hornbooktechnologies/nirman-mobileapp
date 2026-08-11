import { Module } from '@nestjs/common';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { WorkersController } from './workers.controller';
import { WorkersRepository } from './workers.repository';
import { WorkersService } from './workers.service';

@Module({
  imports: [ProjectAccessModule],
  controllers: [WorkersController],
  providers: [WorkersRepository, WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
