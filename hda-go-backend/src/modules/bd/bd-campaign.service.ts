import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { BDEditCampaignDto } from './dto/bd-review.dto';

// ══════════════════════════════════════════════════════════════
// BD CAMPAIGN SERVICE
//
// Extracted from bd.service.ts — handles all campaign-related
// BD operations: dashboard, review, approve, revision, edit,
// deal submission, brand assignments.
// ══════════════════════════════════════════════════════════════

@Injectable()
export class BdCampaignService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ──────────────────────────────────────────────
  // BD DASHBOARD — Aggregated Overview
  // ──────────────────────────────────────────────
  async getDashboard(bdUserId: string) {
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause =
      assignedBrands.length > 0 ? { brand_id: { in: assignedBrands } } : {};

    const allCampaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    const pendingCount = allCampaigns.filter(
      (c) => c.status === 'PENDING_BD',
    ).length;
    const approvedCount = allCampaigns.filter(
      (c) => c.status === 'BD_APPROVED',
    ).length;
    const revisionCount = allCampaigns.filter(
      (c) => c.status === 'BD_REVISION',
    ).length;
    const activeCount = allCampaigns.filter(
      (c) => c.status === 'ACTIVE',
    ).length;

    const totalBudget = allCampaigns
      .filter((c) => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .reduce((sum, c) => sum + c.budget, 0);

    const recentPending = allCampaigns
      .filter((c) => c.status === 'PENDING_BD')
      .slice(0, 5);

    const brandIds = [...new Set(recentPending.map((c) => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const pendingWithBrand = recentPending.map((c) => ({
      ...c,
      brand: brandMap.get(c.brand_id) || { name: 'Unknown Brand' },
    }));

    const recentActivity = await this.prisma.campaignEditLog.findMany({
      where: {
        campaign: whereClause,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { campaign: { select: { title: true } } },
    });

    const categoryBreakdown: Record<string, number> = {};
    allCampaigns
      .filter((c) => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .forEach((c) => {
        categoryBreakdown[c.category] =
          (categoryBreakdown[c.category] || 0) + 1;
      });

    return {
      summary: {
        pendingCount,
        approvedCount,
        revisionCount,
        activeCount,
        totalCampaigns: allCampaigns.length,
        totalBudget,
        assignedBrands: assignedBrands.length,
      },
      recentPending: pendingWithBrand,
      recentActivity,
      categoryBreakdown,
    };
  }

  // ──────────────────────────────────────────────
  // GET CAMPAIGNS BY STATUS
  // ──────────────────────────────────────────────
  async getCampaignsByStatus(bdUserId: string, status: string) {
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause: Record<string, unknown> = { status };
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { participants: true, submissions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const brandIds = [...new Set(campaigns.map((c) => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    return campaigns.map((c) => ({
      ...c,
      brand: brandMap.get(c.brand_id) || { name: 'Unknown Brand' },
    }));
  }

  // ──────────────────────────────────────────────
  // CAMPAIGN DETAIL
  // ──────────────────────────────────────────────
  async getCampaignDetail(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        editLogs: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
        _count: {
          select: { participants: true, submissions: true },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const brand = await this.prisma.user.findUnique({
      where: { id: campaign.brand_id },
      select: { id: true, name: true, email: true },
    });

    let bdReviewer: { id: string; name: string; email: string } | null = null;
    if (campaign.bd_reviewer_id) {
      bdReviewer = await this.prisma.user.findUnique({
        where: { id: campaign.bd_reviewer_id },
        select: { id: true, name: true, email: true },
      });
    }

    const editorIds = [...new Set(campaign.editLogs.map((l) => l.editor_id))];
    const editors = await this.prisma.user.findMany({
      where: { id: { in: editorIds } },
      select: { id: true, name: true },
    });
    const editorMap = new Map(editors.map((e) => [e.id, e.name]));

    const enrichedLogs = campaign.editLogs.map((log) => ({
      ...log,
      editor_name: editorMap.get(log.editor_id) || 'Unknown',
    }));

    return {
      ...campaign,
      brand,
      bdReviewer,
      editLogs: enrichedLogs,
    };
  }

  // ──────────────────────────────────────────────
  // APPROVE CAMPAIGN
  // ──────────────────────────────────────────────
  async approveCampaign(campaignId: string, bdUserId: string, notes?: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING_BD' && campaign.status !== 'BD_REVISION') {
      throw new BadRequestException(
        `Campaign status is "${campaign.status}", can only approve PENDING_BD or BD_REVISION`,
      );
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'BD_APPROVED',
        bd_reviewer_id: bdUserId,
        bd_reviewed_at: new Date(),
        bd_approved_at: new Date(),
        bd_notes: notes || 'Approved by BD',
      },
    });

    await this.prisma.campaignEditLog.create({
      data: {
        campaign_id: campaignId,
        editor_id: bdUserId,
        editor_role: 'BD',
        field_name: 'status',
        old_value: campaign.status,
        new_value: 'BD_APPROVED',
        action: 'APPROVE',
        notes: notes || 'Campaign approved by BD',
      },
    });

    const bdUser = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { name: true },
    });

    const cmUsers = await this.prisma.user.findMany({
      where: { role: 'CM' },
      select: { id: true },
    });

    for (const cm of cmUsers) {
      await this.prisma.notification.create({
        data: {
          user_id: cm.id,
          title: '📋 Campaign Baru dari BD',
          message: `Campaign "${campaign.title}" telah di-approve oleh ${bdUser?.name || 'BD'} dan siap dikelola. Budget: Rp ${campaign.budget.toLocaleString()}.`,
          type: 'CAMPAIGN',
          read_status: false,
        },
      });

      this.eventsGateway.emitNotification(cm.id, {
        title: '📋 Campaign Baru dari BD',
        message: `Campaign "${campaign.title}" approved dan siap dikelola.`,
        type: 'CAMPAIGN',
      });
    }

    await this.prisma.notification.create({
      data: {
        user_id: campaign.brand_id,
        title: '✅ Campaign Approved!',
        message: `Campaign "${campaign.title}" telah di-approve oleh tim BD. Campaign akan segera dikelola oleh tim CM.`,
        type: 'CAMPAIGN',
        read_status: false,
      },
    });

    this.eventsGateway.emitNotification(campaign.brand_id, {
      title: '✅ Campaign Approved!',
      message: `Campaign "${campaign.title}" telah di-approve oleh tim BD.`,
      type: 'CAMPAIGN',
    });

    return { campaign: updated, notifiedCMs: cmUsers.length };
  }

  // ──────────────────────────────────────────────
  // REQUEST REVISION
  // ──────────────────────────────────────────────
  async requestRevision(campaignId: string, bdUserId: string, notes: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING_BD') {
      throw new BadRequestException(
        `Campaign status is "${campaign.status}", can only request revision from PENDING_BD`,
      );
    }

    if (!notes || notes.trim().length === 0) {
      throw new BadRequestException('Revision notes are required');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'BD_REVISION',
        bd_reviewer_id: bdUserId,
        bd_reviewed_at: new Date(),
        bd_notes: notes,
      },
    });

    await this.prisma.campaignEditLog.create({
      data: {
        campaign_id: campaignId,
        editor_id: bdUserId,
        editor_role: 'BD',
        field_name: 'status',
        old_value: campaign.status,
        new_value: 'BD_REVISION',
        action: 'REVISION',
        notes,
      },
    });

    const bdUser = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { name: true },
    });

    await this.prisma.notification.create({
      data: {
        user_id: campaign.brand_id,
        title: '🔄 Revisi Diperlukan',
        message: `Campaign "${campaign.title}" memerlukan revisi dari ${bdUser?.name || 'BD'}: "${notes}"`,
        type: 'CAMPAIGN',
        read_status: false,
      },
    });

    this.eventsGateway.emitNotification(campaign.brand_id, {
      title: '🔄 Revisi Diperlukan',
      message: `Campaign "${campaign.title}" perlu revisi: "${notes}"`,
      type: 'CAMPAIGN',
    });

    return { campaign: updated, notified: true };
  }

  // ──────────────────────────────────────────────
  // EDIT CAMPAIGN
  // ──────────────────────────────────────────────
  async editCampaign(
    campaignId: string,
    bdUserId: string,
    dto: BDEditCampaignDto,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const updateData: Record<string, unknown> = {};
    const editLogs: Array<{
      campaign_id: string;
      editor_id: string;
      editor_role: string;
      field_name: string;
      old_value: string;
      new_value: string;
      action: string;
      notes: string | null;
    }> = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      category: 'category',
      min_level: 'min_level',
      sow_total: 'sow_total',
      reward_type: 'reward_type',
      deadline: 'deadline',
      budget: 'budget',
      slot: 'slot',
      brief_url: 'brief_url',
      target_creators_count: 'target_creators_count',
      collaboration_type: 'collaboration_type',
      start_date: 'start_date',
      description: 'description',
      pic_contact: 'pic_contact',
      brief_text: 'brief_text',
    };

    for (const [dtoField, dbField] of Object.entries(fieldMap)) {
      const newValue = (dto as Record<string, unknown>)[dtoField];
      if (newValue !== undefined && newValue !== null) {
        const oldValue = (campaign as Record<string, unknown>)[dbField];
        const processedNew =
          (dbField === 'deadline' || dbField === 'start_date') && newValue
            ? new Date(newValue as string)
            : newValue;

        if (String(oldValue) !== String(newValue)) {
          updateData[dbField] = processedNew;
          editLogs.push({
            campaign_id: campaignId,
            editor_id: bdUserId,
            editor_role: 'BD',
            field_name: dbField,
            old_value: String(oldValue ?? ''),
            new_value: String(newValue),
            action: 'EDIT',
            notes: dto.notes || null,
          });
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { campaign, message: 'No changes detected' };
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    await this.prisma.campaignEditLog.createMany({ data: editLogs });

    return {
      campaign: updated,
      fieldsChanged: editLogs.length,
      changes: editLogs.map((l) => ({
        field: l.field_name,
        from: l.old_value,
        to: l.new_value,
      })),
    };
  }

  // ──────────────────────────────────────────────
  // REVIEW HISTORY
  // ──────────────────────────────────────────────
  async getReviewHistory(bdUserId: string) {
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause: Record<string, unknown> = {
      status: {
        in: ['BD_APPROVED', 'BD_REVISION', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      },
      bd_reviewer_id: { not: null },
    };
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { bd_reviewed_at: 'desc' },
    });

    const userIds = [
      ...new Set([
        ...campaigns.map((c) => c.brand_id),
        ...campaigns
          .filter((c) => c.bd_reviewer_id)
          .map((c) => c.bd_reviewer_id!),
      ]),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return campaigns.map((c) => ({
      ...c,
      brand_name: userMap.get(c.brand_id) || 'Unknown',
      bd_reviewer_name: c.bd_reviewer_id
        ? userMap.get(c.bd_reviewer_id) || 'Unknown'
        : null,
    }));
  }

  // ──────────────────────────────────────────────
  // SUBMIT NEW DEAL
  // ──────────────────────────────────────────────
  async submitNewDeal(bdUserId: string, dto: BDEditCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title || '',
        category: dto.category || 'HOTEL',
        brand_id: ((dto as Record<string, unknown>).brand_id as string) || '',
        sow_total: dto.sow_total || 0,
        reward_type: dto.reward_type || 'FIXED',
        deadline: dto.deadline
          ? new Date(dto.deadline)
          : dto.start_date
            ? new Date(
                new Date(dto.start_date).getTime() + 30 * 24 * 60 * 60 * 1000,
              )
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING_BD',
        budget: dto.budget || 0,
        slot: dto.slot || 0,
        brief_url: dto.brief_url || null,
        collaboration_type: dto.collaboration_type || null,
        target_creators_count: dto.target_creators_count || 0,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        description: dto.description || null,
        pic_contact: dto.pic_contact || null,
        brief_text: dto.brief_text || null,
      },
    });

    await this.prisma.campaignEditLog.create({
      data: {
        campaign_id: campaign.id,
        editor_id: bdUserId,
        editor_role: 'BD',
        field_name: 'status',
        old_value: '',
        new_value: 'PENDING_BD',
        action: 'CREATE',
        notes: `New deal created: ${dto.title || ''}`,
      },
    });

    return { success: true, campaign };
  }

  // ──────────────────────────────────────────────
  // BRAND ASSIGNMENT MANAGEMENT
  // ──────────────────────────────────────────────
  async assignBrand(bdUserId: string, brandUserId: string) {
    const existing = await this.prisma.brandBDAssignment.findUnique({
      where: {
        bd_user_id_brand_user_id: {
          bd_user_id: bdUserId,
          brand_user_id: brandUserId,
        },
      },
    });

    if (existing) {
      if (!existing.is_active) {
        return this.prisma.brandBDAssignment.update({
          where: { id: existing.id },
          data: { is_active: true },
        });
      }
      return existing;
    }

    return this.prisma.brandBDAssignment.create({
      data: { bd_user_id: bdUserId, brand_user_id: brandUserId },
    });
  }

  async getAssignments(bdUserId: string) {
    const assignments = await this.prisma.brandBDAssignment.findMany({
      where: { bd_user_id: bdUserId, is_active: true },
    });

    const brandIds = assignments.map((a) => a.brand_user_id);
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });

    return assignments.map((a) => ({
      ...a,
      brand: brands.find((b) => b.id === a.brand_user_id) || {
        name: 'Unknown',
      },
    }));
  }

  // ── Helper: Get assigned brand IDs for a BD user ──
  async getAssignedBrandIds(bdUserId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') return [];

    const assignments = await this.prisma.brandBDAssignment.findMany({
      where: { bd_user_id: bdUserId, is_active: true },
      select: { brand_user_id: true },
    });
    return assignments.map((a) => a.brand_user_id);
  }
}
