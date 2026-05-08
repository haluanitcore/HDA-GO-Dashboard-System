import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubmissionDto, ReviewSubmissionDto } from './dto/submission.dto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // 20. SUBMISSION WORKFLOW
  // Creator Create Content → Submit VT Link → Record Created → QC Queue Updated
  // ══════════════════════════════════════════════
  async create(creatorId: string, dto: CreateSubmissionDto) {
    // Verify creator is participant of this campaign
    const participant = await this.prisma.campaignParticipant.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: dto.campaign_id,
          creator_id: creatorId,
        },
      },
    });

    if (!participant) {
      throw new BadRequestException('Kamu belum bergabung di campaign ini');
    }

    const submission = await this.prisma.submission.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: creatorId,
        tiktok_url: dto.tiktok_url,
        status: 'QC_REVIEW', // Langsung masuk QC queue
      },
    });

    // Create deliverable tracking
    await this.prisma.submissionDeliverable.create({
      data: {
        submission_id: submission.id,
        total_sow: dto.total_sow,
        completed_sow: 0,
        remaining_sow: dto.total_sow,
      },
    });

    // Increment creator post count
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { total_posts: { increment: 1 } },
    });

    // Notify CM about new submission in QC queue
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: { user: { select: { name: true } } },
    });

    if (creator?.cm_id) {
      await this.prisma.notification.create({
        data: {
          user_id: creator.cm_id,
          title: '📝 Submission Baru - QC Queue',
          message: `${creator.user.name} submit VT untuk campaign. Menunggu QC review.`,
          type: 'QC',
          read_status: false,
        },
      });
    }

    return submission;
  }

  // ══════════════════════════════════════════════
  // 21. SUBMISSION STATUS FLOW
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

    // ── 22. SOW TRACKING FLOW ──
    // Submission Approved → completed_sow +1 → remaining_sow -1 → Progress Updated
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
          message: `VT kamu telah disetujui oleh QC. ${dto.qc_notes || ''}`,
          type: 'QC',
          read_status: false,
        },
      });
    }

    if (dto.status === 'REVISION') {
      // Notify creator about revision needed
      await this.prisma.notification.create({
        data: {
          user_id: submission.creator_id,
          title: '🔄 Revision Diperlukan',
          message: `VT kamu perlu direvisi. Catatan: ${dto.qc_notes || 'Silakan cek kembali.'}`,
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

  // ── GET SOW PROGRESS BY CAMPAIGN (Dominos Pizza: 2/4 Posted) ──
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
        totalSow: s.deliverable?.total_sow || 0,
        completedSow: s.deliverable?.completed_sow || 0,
        remainingSow: s.deliverable?.remaining_sow || 0,
        progressLabel: `${s.deliverable?.completed_sow || 0}/${s.deliverable?.total_sow || 0} Posted`,
      })),
    };
  }
}
