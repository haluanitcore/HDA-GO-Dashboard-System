import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GDriveService } from '../gdrive/gdrive.service';
import { CreateSubmissionUploadDto, ReviewSubmissionDto } from './dto/submission.dto';
import * as fs from 'fs';

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

    // 2. Create submission record (status: UPLOADING)
    const submission = await this.prisma.submission.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: creatorId,
        tiktok_url: '', // Will be filled with GDrive link
        status: 'UPLOADING',
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
      },
    });

    // 3. Create deliverable tracking
    await this.prisma.submissionDeliverable.create({
      data: {
        submission_id: submission.id,
        total_sow: totalSow,
        completed_sow: 0,
        remaining_sow: totalSow,
      },
    });

    // 4. Increment creator post count
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { total_posts: { increment: 1 } },
    });

    // 5. Background: Upload to Google Drive CM
    this.uploadToGDriveAndCleanup(submission.id, creatorId, file).catch((err) => {
      this.logger.error(`Background GDrive upload failed for submission ${submission.id}`, err);
    });

    // 6. Return immediately (don't wait for GDrive upload)
    return {
      ...submission,
      message: 'File berhasil diupload! Sedang dikirim ke Google Drive CM...',
    };
  }

  /**
   * Background job: Upload file to CM's Google Drive folder, then cleanup VPS
   */
  private async uploadToGDriveAndCleanup(
    submissionId: string,
    creatorId: string,
    file: Express.Multer.File,
  ) {
    try {
      // Get creator's CM info including gdrive folder
      const creator = await this.prisma.creator.findUnique({
        where: { user_id: creatorId },
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

      let fileUrl = '';
      let gdriveFileId: string | null = null;

      // Determine the GDrive folder ID
      const folderId = creator?.cm_user?.gdrive_folder_id
        || GDriveService.extractFolderId(creator?.cm_user?.gdrive_url || '');

      if (folderId && this.gdriveService.isAvailable()) {
        // Upload to Google Drive
        const creatorName = creator?.user?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'creator';
        const timestamp = new Date().toISOString().split('T')[0];
        const gdriveFileName = `${creatorName}_${timestamp}_${file.originalname}`;

        const result = await this.gdriveService.uploadFile(
          file.path,
          gdriveFileName,
          file.mimetype,
          folderId,
        );

        if (result) {
          fileUrl = result.webViewLink;
          gdriveFileId = result.fileId;
          this.logger.log(`✅ File uploaded to GDrive: ${fileUrl}`);
        }
      }

      // If GDrive upload failed or not available, use local file URL
      if (!fileUrl) {
        fileUrl = `/uploads/${file.filename}`;
        this.logger.warn(`⚠️ GDrive unavailable — file stored locally: ${fileUrl}`);
      }

      // Update submission with file URL and set status to QC_REVIEW
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          tiktok_url: fileUrl,
          gdrive_file_id: gdriveFileId,
          status: 'QC_REVIEW',
        },
      });

      // Delete local temp file if GDrive upload succeeded
      if (gdriveFileId && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        this.logger.log(`🗑️ Temp file deleted from VPS: ${file.path}`);
      }

      // Notify CM about new submission
      if (creator?.cm_id) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: (await this.prisma.submission.findUnique({ where: { id: submissionId } }))?.campaign_id || '' },
          select: { title: true },
        });

        await this.prisma.notification.create({
          data: {
            user_id: creator.cm_id,
            title: '📝 Submission Baru - QC Queue',
            message: `${creator.user.name} mengupload konten untuk campaign "${campaign?.title || ''}". File sudah di Google Drive Anda.`,
            type: 'QC',
            read_status: false,
          },
        });
      }
    } catch (error) {
      this.logger.error(`❌ GDrive upload failed for submission ${submissionId}`, error);
      // Set status to QC_REVIEW anyway with local path so submission isn't stuck
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          tiktok_url: `/uploads/${file.filename}`,
          status: 'QC_REVIEW',
        },
      });
    }
  }

  // ══════════════════════════════════════════════
  // SUBMISSION STATUS FLOW
  // QC_REVIEW → APPROVED / REVISION → POSTED → COMPLETED
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
    };

    // Set review timestamp
    if (dto.status === 'APPROVED' || dto.status === 'REVISION') {
      updateData.reviewed_at = new Date();
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
    });

    // SOW TRACKING FLOW
    if (dto.status === 'APPROVED') {
      const deliverable = await this.prisma.submissionDeliverable.findUnique({
        where: { submission_id: submissionId },
      });

      if (deliverable && deliverable.remaining_sow > 0) {
        await this.prisma.submissionDeliverable.update({
          where: { submission_id: submissionId },
          data: {
            completed_sow: { increment: 1 },
            remaining_sow: { decrement: 1 },
          },
        });
      }

      // Notify creator about approval
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

    return updated;
  }

  // ── Mark as POSTED (content goes live) ──
  async markAsPosted(submissionId: string) {
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'POSTED', posted_at: new Date() },
    });
  }

  // ── Mark as COMPLETED ──
  async markAsCompleted(submissionId: string) {
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });
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

  // ── GET ALL PENDING QC (for CM dashboard) ──
  async findPendingQC() {
    return this.prisma.submission.findMany({
      where: { status: 'QC_REVIEW' },
      include: {
        creator: {
          include: { user: { select: { name: true } } },
        },
        campaign: { select: { title: true, category: true } },
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
}
