import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GDriveService } from '../gdrive/gdrive.service';
import { CreateSubmissionUploadDto, ReviewSubmissionDto, BulkReviewDto } from './dto/submission.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private prisma: PrismaService,
    private gdriveService: GDriveService,
  ) {}

  // ══════════════════════════════════════════════
  // SUBMISSION WORKFLOW — Direct File Upload
  // Creator Upload File → Save to VPS → Upload to GDrive CM → Auto-Delete from VPS
  // ══════════════════════════════════════════════
  async createWithUpload(creatorId: string, file: Express.Multer.File, dto: CreateSubmissionUploadDto) {
    const totalSow = parseInt(dto.total_sow, 10) || 1;

    // 1. Verify creator is participant of this campaign
    const participant = await this.prisma.campaignParticipant.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: dto.campaign_id,
          creator_id: creatorId,
        },
      },
    });

    if (!participant) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException('Kamu belum bergabung di campaign ini');
    }

    // 2. Create submission record (status: QC_REVIEW, save local VPS URL)
    const localUrl = `/api/uploads/${file.filename}`;
    const submission = await this.prisma.submission.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: creatorId,
        tiktok_url: localUrl,
        status: 'QC_REVIEW',
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
      },
    });

    // 3. Create/sync deliverables
    await this.syncDeliverables(creatorId, dto.campaign_id);

    // 4. Increment creator post count
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { total_posts: { increment: 1 } },
    });

    // 5. Notify CM about new submission in QC Queue
    try {
      const creator = await this.prisma.creator.findUnique({
        where: { user_id: creatorId },
        include: { user: { select: { name: true } } },
      });
      if (creator?.cm_id) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: dto.campaign_id },
          select: { title: true },
        });

        await this.prisma.notification.create({
          data: {
            user_id: creator.cm_id,
            title: '📝 Submission Baru - QC Queue',
            message: `${creator.user.name} mengupload konten untuk campaign "${campaign?.title || ''}". Menunggu peninjauan QC Team.`,
            type: 'QC',
            read_status: false,
          },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to notify CM for submission ${submission.id} upload`, err);
    }

    // 6. Return immediately (saved locally, GDrive upload will happen on Approval)
    return {
      ...submission,
      message: 'File berhasil diupload! Menunggu proses verifikasi oleh QC Team...',
    };
  }

  /**
   * Helper to upload local VPS file to GDrive and delete local file after success
   */
  private async uploadLocalFileToGDrive(submission: any): Promise<{ url: string; fileId: string | null }> {
    try {
      if (!submission.tiktok_url || !submission.tiktok_url.startsWith('/api/uploads/')) {
        this.logger.warn(`Submission ${submission.id} does not have a local path: ${submission.tiktok_url}`);
        return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
      }

      const filename = submission.tiktok_url.replace('/api/uploads/', '');
      const filePath = path.join(process.cwd(), 'tmp_uploads', filename);

      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Local file not found at ${filePath} for submission ${submission.id}`);
        return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
      }

      // Get CM GDrive folder
      const creator = await this.prisma.creator.findUnique({
        where: { user_id: submission.creator_id },
        include: {
          user: { select: { name: true } },
          cm_user: {
            select: {
              id: true,
              name: true,
              gdrive_url: true,
              gdrive_folder_id: true,
            },
          },
        },
      });

      const folderId = creator?.cm_user?.gdrive_folder_id
        || GDriveService.extractFolderId(creator?.cm_user?.gdrive_url || '');

      if (!folderId) {
        this.logger.warn(`CM GDrive folder not found for creator ${submission.creator_id} — keeping file local`);
        return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
      }

      if (!this.gdriveService.isAvailable()) {
        this.logger.warn(`GDriveService not initialized — keeping file local`);
        return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
      }

      const creatorName = creator?.user?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'creator';
      const timestamp = new Date().toISOString().split('T')[0];
      const gdriveFileName = `${creatorName}_${timestamp}_${submission.file_name || filename}`;

      this.logger.log(`📤 Uploading approved file to GDrive for submission ${submission.id}...`);
      const result = await this.gdriveService.uploadFile(
        filePath,
        gdriveFileName,
        submission.file_type || 'video/mp4',
        folderId,
      );

      if (result) {
        // Delete local temp file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`🗑️ Temp file deleted from VPS after GDrive upload: ${filePath}`);
        }
        return { url: result.webViewLink, fileId: result.fileId };
      }

      return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
    } catch (error) {
      this.logger.error(`Failed uploading file to GDrive on approval for submission ${submission.id}`, error);
      return { url: submission.tiktok_url, fileId: submission.gdrive_file_id };
    }
  }

  // ══════════════════════════════════════════════
  // SUBMISSION STATUS FLOW
  // QC_REVIEW → APPROVED / REVISION / REJECTED → POSTED → COMPLETED
  // ══════════════════════════════════════════════
  async review(submissionId: string, dto: ReviewSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { creator: { include: { user: { select: { name: true } } } } },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    const updateData: any = {
      status: dto.status,
      qc_notes: dto.qc_notes,
      quality_score: dto.quality_score !== undefined ? dto.quality_score : undefined,
      checked_items: dto.checked_items !== undefined ? dto.checked_items : undefined,
      qc_issues: dto.qc_issues !== undefined ? dto.qc_issues : undefined,
      internal_tags: dto.internal_tags !== undefined ? dto.internal_tags : undefined,
      schedule_posting: dto.schedule_posting ? new Date(dto.schedule_posting) : undefined,
      reviewer_id: dto.reviewer_id !== undefined ? dto.reviewer_id : undefined,
    };

    // Set review timestamp
    if (dto.status === 'APPROVED' || dto.status === 'REVISION' || dto.status === 'REJECTED') {
      updateData.reviewed_at = new Date();
    }

    if (dto.status === 'REVISION' || dto.status === 'REJECTED') {
      updateData.revision_count = { increment: 1 };
      // Default revision deadline: 2 days from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      updateData.revision_deadline = deadline;
    } else if (dto.status === 'APPROVED') {
      // Clear revision deadline on approval
      updateData.revision_deadline = null;

      // ── NEW FLOW: Upload file to GDrive CM and delete from local VPS ──
      const uploadResult = await this.uploadLocalFileToGDrive(submission);
      updateData.tiktok_url = uploadResult.url;
      updateData.gdrive_file_id = uploadResult.fileId;
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
    });

    // SOW TRACKING FLOW
    await this.syncDeliverables(submission.creator_id, submission.campaign_id);

    if (dto.status === 'APPROVED') {
      await this.prisma.notification.create({
        data: {
          user_id: submission.creator_id,
          title: '✅ Submission Approved!',
          message: `Konten kamu telah disetujui oleh QC. ${dto.qc_notes || ''}`,
          type: 'QC',
          read_status: false,
        },
      });
    }

    if (dto.status === 'REVISION') {
      await this.prisma.notification.create({
        data: {
          user_id: submission.creator_id,
          title: '🔄 Revision Diperlukan',
          message: `Konten kamu perlu direvisi. Catatan: ${dto.qc_notes || 'Silakan cek kembali.'}`,
          type: 'QC',
          read_status: false,
        },
      });
    }

    if (dto.status === 'REJECTED') {
      await this.prisma.notification.create({
        data: {
          user_id: submission.creator_id,
          title: '❌ Submission Ditolak',
          message: `Konten kamu ditolak oleh QC. Catatan: ${dto.qc_notes || 'Silakan hubungi CM.'}`,
          type: 'QC',
          read_status: false,
        },
      });
    }

    return updated;
  }

  // ── Stage 4 Bulk Review Workflow ──
  async bulkReview(dto: BulkReviewDto) {
    const results: any[] = [];
    for (const subId of dto.submissionIds) {
      try {
        const res = await this.review(subId, {
          status: dto.status,
          qc_notes: dto.qc_notes,
          qc_issues: dto.qc_issues,
          internal_tags: dto.internal_tags,
          schedule_posting: dto.schedule_posting,
          reviewer_id: dto.reviewer_id,
        });
        results.push(res);
      } catch (err) {
        this.logger.error(`Error in bulkReview for submission ${subId}:`, err);
      }
    }
    return { success: true, count: results.length };
  }

  async markAsPosted(submissionId: string) {
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'POSTED', posted_at: new Date() },
    });
    await this.syncDeliverables(updated.creator_id, updated.campaign_id);
    return updated;
  }

  // ── Mark as COMPLETED ──
  async markAsCompleted(submissionId: string) {
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });
    await this.syncDeliverables(updated.creator_id, updated.campaign_id);
    return updated;
  }

  // ── GET SUBMISSIONS BY CREATOR ──
  async findByCreator(creatorId: string) {
    return this.prisma.submission.findMany({
      where: { creator_id: creatorId },
      include: {
        campaign: { select: { title: true, category: true, deadline: true, sow_total: true } },
        deliverable: true,
      },
      orderBy: { submitted_at: 'desc' },
    });
  }

  // ── GET SUBMISSIONS BY CAMPAIGN (for CM QC view) ──
  async findByCampaign(campaignId: string) {
    return this.prisma.submission.findMany({
      where: { campaign_id: campaignId },
      include: {
        creator: {
          include: { user: { select: { name: true } } },
        },
        deliverable: true,
      },
      orderBy: { submitted_at: 'desc' },
    });
  }

  // ── SYNC DELIVERABLES ACROSS SIBLINGS ──
  private async syncDeliverables(creatorId: string, campaignId: string) {
    const totalSow = (await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sow_total: true },
    }))?.sow_total || 1;

    const siblingSubmissions = await this.prisma.submission.findMany({
      where: { creator_id: creatorId, campaign_id: campaignId },
      select: { id: true, status: true },
    });

    const approvedCount = siblingSubmissions.filter(s =>
      ['APPROVED', 'POSTED', 'COMPLETED'].includes(s.status)
    ).length;

    for (const sib of siblingSubmissions) {
      await this.prisma.submissionDeliverable.upsert({
        where: { submission_id: sib.id },
        create: {
          submission_id: sib.id,
          total_sow: totalSow,
          completed_sow: approvedCount,
          remaining_sow: Math.max(0, totalSow - approvedCount),
        },
        update: {
          completed_sow: approvedCount,
          remaining_sow: Math.max(0, totalSow - approvedCount),
        },
      });
    }
  }

  // ── GET ALL PENDING QC (for CM dashboard) ──
  async findPendingQC() {
    return this.prisma.submission.findMany({
      where: { status: 'QC_REVIEW' },
      include: {
        creator: {
          include: { user: { select: { name: true } } },
        },
        campaign: { select: { title: true, category: true, qc_checklist: true } },
        deliverable: true,
      },
      orderBy: { submitted_at: 'asc' },
    });
  }

  // ── GET SOW PROGRESS BY CAMPAIGN ──
  async getSowProgress(campaignId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { campaign_id: campaignId },
      include: {
        creator: { include: { user: { select: { name: true } } } },
        deliverable: true,
      },
    });

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    return {
      campaignTitle: campaign?.title,
      totalSOW: campaign?.sow_total || 0,
      creators: submissions.map((s) => ({
        name: s.creator.user.name,
        status: s.status,
        fileName: s.file_name,
        fileType: s.file_type,
        totalSow: s.deliverable?.total_sow || 0,
        completedSow: s.deliverable?.completed_sow || 0,
        remainingSow: s.deliverable?.remaining_sow || 0,
        progressLabel: `${s.deliverable?.completed_sow || 0}/${s.deliverable?.total_sow || 0} Posted`,
      })),
    };
  }

  // ── GET DYNAMIC QC PERFORMANCE METRICS ──
  async getQcStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Reviewed today: reviewed_at is today, status is APPROVED, REVISION, or REJECTED
    const reviewedToday = await this.prisma.submission.count({
      where: {
        reviewed_at: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          in: ['APPROVED', 'REVISION', 'REJECTED', 'POSTED', 'COMPLETED'],
        },
      },
    });

    // Total reviewed historically (to compute rates)
    const totalReviewed = await this.prisma.submission.count({
      where: {
        status: {
          in: ['APPROVED', 'REVISION', 'REJECTED', 'POSTED', 'COMPLETED'],
        },
      },
    });

    let approvalRate = 0;
    let revisionRate = 0;
    let rejectionRate = 0;

    if (totalReviewed > 0) {
      const approvedCount = await this.prisma.submission.count({
        where: {
          status: {
            in: ['APPROVED', 'POSTED', 'COMPLETED'],
          },
        },
      });

      const revisionCount = await this.prisma.submission.count({
        where: {
          status: 'REVISION',
        },
      });

      const rejectedCount = await this.prisma.submission.count({
        where: {
          status: 'REJECTED',
        },
      });

      approvalRate = Math.round((approvedCount / totalReviewed) * 100);
      revisionRate = Math.round((revisionCount / totalReviewed) * 100);
      rejectionRate = Math.round((rejectedCount / totalReviewed) * 100);
    }

    const pendingCount = await this.prisma.submission.count({
      where: {
        status: 'QC_REVIEW',
      },
    });

    return {
      reviewedToday,
      dailyTarget: 60,
      approvalRate,
      revisionRate,
      rejectionRate,
      pendingCount,
    };
  }

  // ── SUBMIT LINK VT (Creator → TikTok VT URL) ──
  async submitVtLink(submissionId: string, creatorId: string, vtLink: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.creator_id !== creatorId) {
      throw new BadRequestException('Anda tidak memiliki akses ke submission ini');
    }

    // Only allow VT link on approved/posted/completed submissions
    if (!['APPROVED', 'POSTED', 'COMPLETED'].includes(submission.status)) {
      throw new BadRequestException('VT link hanya bisa disubmit setelah konten disetujui');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { tiktok_vt_link: vtLink },
    });

    return { success: true, submission: updated };
  }
}
