import { Module } from '@nestjs/common';
import { BdService } from './bd.service';
import { BdController } from './bd.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BdController],
  providers: [BdService],
  exports: [BdService],
})
export class BdModule {}
