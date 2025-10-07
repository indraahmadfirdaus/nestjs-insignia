import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscordService } from './discord.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
