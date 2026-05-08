import { Module } from '@nestjs/common';
import { GmvService } from './gmv.service';
import { GmvController } from './gmv.controller';
import { LevelsModule } from '../levels/levels.module';

@Module({
  imports: [LevelsModule],
  controllers: [GmvController],
  providers: [GmvService],
  exports: [GmvService],
})
export class GmvModule {}
