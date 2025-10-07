import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { LogsController, TaskLogsController } from './logs.controller';

@Module({
  controllers: [TasksController, LogsController, TaskLogsController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
