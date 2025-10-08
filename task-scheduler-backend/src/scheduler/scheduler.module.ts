import { Module, forwardRef } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TasksModule } from '../tasks/tasks.module';
import { DiscordModule } from '../discord/discord.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => TasksModule), DiscordModule, PrismaModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
