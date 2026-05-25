import { Module, Global } from '@nestjs/common';
import { GDriveService } from './gdrive.service';

@Global()
@Module({
  providers: [GDriveService],
  exports: [GDriveService],
})
export class GDriveModule {}
