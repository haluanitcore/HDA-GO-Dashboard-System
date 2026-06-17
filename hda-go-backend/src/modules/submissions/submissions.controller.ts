import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { SubmissionsService } from './submissions.service';
import {
  CreateSubmissionUploadDto,
  ReviewSubmissionDto,
  BulkReviewDto,
  SubmitVtLinkDto,
} from './dto/submission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig, validateFileSize } from '../../config/upload.config';
import { Throttle } from '@nestjs/throttler';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // POST /submissions/upload — Creator uploads file directly
  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles(Role.CREATOR)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  uploadSubmission(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSubmissionUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('File video atau foto wajib diupload');
    }

    // Validate file size per type (video max 200MB, image max 50MB)
    validateFileSize(file);

    return this.submissionsService.createWithUpload(req.user.userId, file, dto);
  }

  // PATCH /submissions/:id/review — CM reviews (QC & Approval / Revision)
  @Patch(':id/review')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  review(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.submissionsService.review(id, dto, req.user.userId);
  }

  // PATCH /submissions/bulk-review — CM reviews multiple submissions in batch
  @Patch('bulk-review')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  bulkReview(@Req() req: any, @Body() dto: BulkReviewDto) {
    return this.submissionsService.bulkReview(dto, req.user.userId);
  }

  // PATCH /submissions/:id/posted — Mark as posted (content live)
  @Patch(':id/posted')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  markPosted(@Param('id') id: string) {
    return this.submissionsService.markAsPosted(id);
  }

  // PATCH /submissions/:id/completed — Mark as completed
  @Patch(':id/completed')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  markCompleted(@Param('id') id: string) {
    return this.submissionsService.markAsCompleted(id);
  }

  // GET /submissions/my — Creator's own submissions
  @Get('my')
  @Roles(Role.CREATOR)
  findMine(@Req() req: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.submissionsService.findByCreator(
      req.user.userId, 
      skip ? parseInt(skip, 10) : 0, 
      take ? parseInt(take, 10) : 50
    );
  }

  // GET /submissions/qc-queue — All pending QC (CM dashboard)
  @Get('qc-queue')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  findPendingQC(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.submissionsService.findPendingQC(
      skip ? parseInt(skip, 10) : 0, 
      take ? parseInt(take, 10) : 50
    );
  }

  // GET /submissions/qc-stats — Performance stats for QC Team Dashboard
  @Get('qc-stats')
  @Roles(Role.CM, Role.ADMIN, Role.QC)
  getQcStats() {
    return this.submissionsService.getQcStats();
  }

  // GET /submissions/sow/:campaignId — SOW progress by campaign
  @Get('sow/:campaignId')
  @Roles(Role.CM, Role.ADMIN, Role.BRAND, Role.QC)
  getSowProgress(@Param('campaignId') campaignId: string) {
    return this.submissionsService.getSowProgress(campaignId);
  }

  // GET /submissions/campaign/:id — Submissions by campaign
  @Get('campaign/:id')
  @Roles(Role.CM, Role.ADMIN, Role.BRAND, Role.QC)
  findByCampaign(@Param('id') id: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.submissionsService.findByCampaign(
      id,
      skip ? parseInt(skip, 10) : 0, 
      take ? parseInt(take, 10) : 50
    );
  }

  // PATCH /submissions/:id/vt-link — Creator submits TikTok VT link
  @Patch(':id/vt-link')
  @Roles(Role.CREATOR)
  submitVtLink(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitVtLinkDto,
  ) {
    return this.submissionsService.submitVtLink(
      id,
      req.user.userId,
      dto.tiktok_vt_link,
    );
  }
}
