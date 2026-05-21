import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { GmvService } from './gmv.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('gmv')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GmvController {
  constructor(private readonly gmvService: GmvService) {}

  @Post('ocr-parse')
  @Roles(Role.CREATOR)
  @UseInterceptors(FileInterceptor('file'))
  async parseScreenshot(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.gmvService.parseScreenshot(file.buffer);
  }

  @Post('self-report')
  @Roles(Role.CREATOR)
  submitSelfReport(@Req() req: any, @Body() body: any) {
    return this.gmvService.submitSelfReport(req.user.userId, body);
  }

  @Patch(':id/verify')
  @Roles(Role.CM, Role.ADMIN)
  verifyGmv(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.gmvService.verifyGmv(id, req.user.userId, body);
  }

  // POST /gmv/record — Record new order (CM/Admin direct legacy)
  @Post('record')
  @Roles(Role.CM, Role.ADMIN)
  recordOrder(@Body() body: { creator_id: string; campaign_id: string; order_count: number; gmv_amount: number }) {
    return this.gmvService.recordOrder(body.creator_id, body.campaign_id, body.order_count, body.gmv_amount);
  }

  // GET /gmv/pending — Get all pending GMV verifications
  @Get('pending')
  @Roles(Role.CM, Role.ADMIN)
  getPendingGmv() {
    return this.gmvService.getPendingGmv();
  }

  // GET /gmv/my — Creator's own GMV
  @Get('my')
  @Roles(Role.CREATOR)
  getMyGMV(@Req() req: any) {
    return this.gmvService.getCreatorGMV(req.user.userId);
  }

  // GET /gmv/platform — Platform-wide GMV (Executive)
  @Get('platform')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getPlatformGMV() {
    return this.gmvService.getPlatformGMV();
  }
}
