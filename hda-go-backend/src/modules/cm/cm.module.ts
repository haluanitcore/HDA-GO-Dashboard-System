import { Module } from '@nestjs/common';
import { CmService } from './cm.service';
import { CmController } from './cm.controller';
import { CmCreatorsService } from './cm-creators.service';
import { CmCreatorsController } from './cm-creators.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CmController, CmCreatorsController],
  providers: [CmService, CmCreatorsService],
  exports: [CmService, CmCreatorsService],
})
export class CmModule {}
