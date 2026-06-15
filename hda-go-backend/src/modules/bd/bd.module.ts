import { Module } from '@nestjs/common';
import { BdService } from './bd.service';
import { BdCampaignService } from './bd-campaign.service';
import { BdHotelService } from './bd-hotel.service';
import { BdAnalyticsService } from './bd-analytics.service';
import { BdGmvImportService } from './bd-gmv-import.service';
import { BdController } from './bd.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { LevelsModule } from '../levels/levels.module';

@Module({
  imports: [NotificationsModule, LevelsModule],
  controllers: [BdController],
  providers: [
    BdService,
    BdCampaignService,
    BdHotelService,
    BdAnalyticsService,
    BdGmvImportService,
  ],
  exports: [BdService],
})
export class BdModule {}
