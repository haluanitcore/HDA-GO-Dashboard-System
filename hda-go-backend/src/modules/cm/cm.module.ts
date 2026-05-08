import { Module } from '@nestjs/common';
import { CmService } from './cm.service';
import { CmController } from './cm.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CmController],
  providers: [CmService],
  exports: [CmService],
})
export class CmModule {}
