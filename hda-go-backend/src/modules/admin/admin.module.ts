import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminResetService } from './admin-reset.service';
import { AdminSyncService } from './admin-sync.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),   // Enables @Cron decorators
    NotificationsModule,        // Provides EventsGateway
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminResetService, AdminSyncService],
  exports: [AdminService, AdminResetService, AdminSyncService],
})
export class AdminModule {}
