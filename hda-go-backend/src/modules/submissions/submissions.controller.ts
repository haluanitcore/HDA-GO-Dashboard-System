import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionUploadDto, ReviewSubmissionDto, BulkReviewDto } from './dto/submission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig, validateFileSize } from '../../config/upload.config';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // POST /submissions/upload — Creator uploads file directly
  @Post('upload')
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
  @Roles(Role.CM, Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.submissionsService.review(id, dto);
  }

  // PATCH /submissions/bulk-review — CM reviews multiple submissions in batch
  @Patch('bulk-review')
  @Roles(Role.CM, Role.ADMIN)
  bulkReview(@Body() dto: BulkReviewDto) {
    return this.submissionsService.bulkReview(dto);
  }

  // PATCH /submissions/:id/posted — Mark as posted (content live)
  @Patch(':id/posted')
  @Roles(Role.CM, Role.ADMIN)
  markPosted(@Param('id') id: string) {
    return this.submissionsService.markAsPosted(id);
  }

  // PATCH /submissions/:id/completed — Mark as completed
  @Patch(':id/completed')
  @Roles(Role.CM, Role.ADMIN)
  markCompleted(@Param('id') id: string) {
    return this.submissionsService.markAsCompleted(id);
  }

  // GET /submissions/my — Creator's own submissions
  @Get('my')
  @Roles(Role.CREATOR)
  findMine(@Req() req: any) {
    return this.submissionsService.findByCreator(req.user.userId);
  }

  // GET /submissions/qc-queue — All pending QC (CM dashboard)
  @Get('qc-queue')
  @Roles(Role.CM, Role.ADMIN)
  findPendingQC() {
    return this.submissionsService.findPendingQC();
  }

  // GET /submissions/sow/:campaignId — SOW progress by campaign
  @Get('sow/:campaignId')
  @Roles(Role.CM, Role.ADMIN, Role.BRAND)
  getSowProgress(@Param('campaignId') campaignId: string) {
    return this.submissionsService.getSowProgress(campaignId);
  }

  // GET /submissions/campaign/:id — Submissions by campaign
  @Get('campaign/:id')
  @Roles(Role.CM, Role.ADMIN, Role.BRAND)
  findByCampaign(@Param('id') id: string) {
    return this.submissionsService.findByCampaign(id);
  }
}
