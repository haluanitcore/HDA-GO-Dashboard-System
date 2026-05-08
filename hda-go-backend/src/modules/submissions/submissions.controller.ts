import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, ReviewSubmissionDto } from './dto/submission.dto';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // POST /submissions — Creator submits VT
  @Post()
  @Roles(Role.CREATOR)
  create(@Req() req: any, @Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(req.user.userId, dto);
  }

  // PATCH /submissions/:id/review — CM reviews (QC & Approval / Revision)
  @Patch(':id/review')
  @Roles(Role.CM, Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.submissionsService.review(id, dto);
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
