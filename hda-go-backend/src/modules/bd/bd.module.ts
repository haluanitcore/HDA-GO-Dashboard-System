import { Module } from '@nestjs/common';
import { BdService } from './bd.service';
import { BdController } from './bd.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { LevelsModule } from '../levels/levels.module';

@Module({
  imports: [NotificationsModule, LevelsModule],
  controllers: [BdController],
  providers: [BdService],
  exports: [BdService],
})
export class BdModule {}
