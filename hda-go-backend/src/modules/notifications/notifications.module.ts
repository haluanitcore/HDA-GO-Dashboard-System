import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EventsGateway } from './events.gateway';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventsGateway],
  exports: [NotificationsService, EventsGateway],
})
export class NotificationsModule {}
