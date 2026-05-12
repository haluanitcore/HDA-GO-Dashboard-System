import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { BDEditCampaignDto } from './dto/bd-review.dto';

// ══════════════════════════════════════════════════════════════
// BD (Business Development) SERVICE
//
// Workflow: Brand Submit → BD Review → Approve / Revision → CM
// BD is assigned per brand — only sees campaigns from their brands
//
// BD can:
// 1. View pending campaigns from assigned brands
// 2. Edit campaign details before approving
// 3. Approve campaign → forwards to CM
// 4. Request revision → notifies Brand
// 5. View audit trail (who edited, assigned, PIC)
// ══════════════════════════════════════════════════════════════

@Injectable()
export class BdService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ──────────────────────────────────────────────
  // BD DASHBOARD — Aggregated Overview
  // ──────────────────────────────────────────────
  async getDashboard(bdUserId: string) {
    // Get assigned brand IDs for this BD user
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause = assignedBrands.length > 0
      ? { brand_id: { in: assignedBrands } }
      : {}; // Admin sees all

    const allCampaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    const pendingCount = allCampaigns.filter(c => c.status === 'PENDING_BD').length;
    const approvedCount = allCampaigns.filter(c => c.status === 'BD_APPROVED').length;
    const revisionCount = allCampaigns.filter(c => c.status === 'BD_REVISION').length;
    const activeCount = allCampaigns.filter(c => c.status === 'ACTIVE').length;

    const totalBudget = allCampaigns
      .filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .reduce((sum, c) => sum + c.budget, 0);

    // Recent pending campaigns (top 5 for dashboard)
    const recentPending = allCampaigns
      .filter(c => c.status === 'PENDING_BD')
      .slice(0, 5);

    // Fetch brand info for pending campaigns
    const brandIds = [...new Set(recentPending.map(c => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });
    const brandMap = new Map(brands.map(b => [b.id, b]));

    const pendingWithBrand = recentPending.map(c => ({
      ...c,
      brand: brandMap.get(c.brand_id) || { name: 'Unknown Brand' },
    }));

    // Recent activity — last 10 edit logs
    const recentActivity = await this.prisma.campaignEditLog.findMany({
      where: {
        campaign: whereClause,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { campaign: { select: { title: true } } },
    });

    // Category breakdown for approved/active
    const categoryBreakdown: Record<string, number> = {};
    allCampaigns
      .filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .forEach(c => {
        categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
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

    const whereClause: any = { status };
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    // Enrich with brand info
    const brandIds = [...new Set(campaigns.map(c => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });
    const brandMap = new Map(brands.map(b => [b.id, b]));

    return campaigns.map(c => ({
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

    // Get brand info
    const brand = await this.prisma.user.findUnique({
      where: { id: campaign.brand_id },
      select: { id: true, name: true, email: true },
    });

    // Get BD reviewer info
    let bdReviewer: any = null;
    if (campaign.bd_reviewer_id) {
      bdReviewer = await this.prisma.user.findUnique({
        where: { id: campaign.bd_reviewer_id },
        select: { id: true, name: true, email: true },
      });
    }

    // Enrich edit logs with editor names
    const editorIds = [...new Set(campaign.editLogs.map(l => l.editor_id))];
    const editors = await this.prisma.user.findMany({
      where: { id: { in: editorIds } },
      select: { id: true, name: true },
    });
    const editorMap = new Map(editors.map(e => [e.id, e.name]));

    const enrichedLogs = campaign.editLogs.map(log => ({
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
  // Status: PENDING_BD → BD_APPROVED
  // Notify all CM users that a new campaign is ready
  // ──────────────────────────────────────────────
  async approveCampaign(campaignId: string, bdUserId: string, notes?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING_BD' && campaign.status !== 'BD_REVISION') {
      throw new BadRequestException(`Campaign status is "${campaign.status}", can only approve PENDING_BD or BD_REVISION`);
    }

    // Update campaign status
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

    // Log the approval action
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

    // Get BD user name
    const bdUser = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { name: true },
    });

    // Notify all CM users that a new campaign is ready
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

      // Real-time WebSocket notification
      this.eventsGateway.emitNotification(cm.id, {
        title: '📋 Campaign Baru dari BD',
        message: `Campaign "${campaign.title}" approved dan siap dikelola.`,
        type: 'CAMPAIGN',
      });
    }

    // Notify Brand that their campaign was approved
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
  // Status: PENDING_BD → BD_REVISION
  // Notify Brand with feedback/notes
  // ──────────────────────────────────────────────
  async requestRevision(campaignId: string, bdUserId: string, notes: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING_BD') {
      throw new BadRequestException(`Campaign status is "${campaign.status}", can only request revision from PENDING_BD`);
    }

    if (!notes || notes.trim().length === 0) {
      throw new BadRequestException('Revision notes are required');
    }

    // Update campaign status
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'BD_REVISION',
        bd_reviewer_id: bdUserId,
        bd_reviewed_at: new Date(),
        bd_notes: notes,
      },
    });

    // Log the revision action
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

    // Get BD user name
    const bdUser = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { name: true },
    });

    // Notify Brand about the revision request
    await this.prisma.notification.create({
      data: {
        user_id: campaign.brand_id,
        title: '🔄 Revisi Diperlukan',
        message: `Campaign "${campaign.title}" memerlukan revisi dari ${bdUser?.name || 'BD'}: "${notes}"`,
        type: 'CAMPAIGN',
        read_status: false,
      },
    });

    // Real-time notification
    this.eventsGateway.emitNotification(campaign.brand_id, {
      title: '🔄 Revisi Diperlukan',
      message: `Campaign "${campaign.title}" perlu revisi: "${notes}"`,
      type: 'CAMPAIGN',
    });

    return { campaign: updated, notified: true };
  }

  // ──────────────────────────────────────────────
  // EDIT CAMPAIGN — BD can modify before approving
  // Creates audit trail for every field changed
  // ──────────────────────────────────────────────
  async editCampaign(campaignId: string, bdUserId: string, dto: BDEditCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Build update data and create edit logs
    const updateData: any = {};
    const editLogs: any[] = [];

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
    };

    for (const [dtoField, dbField] of Object.entries(fieldMap)) {
      const newValue = (dto as any)[dtoField];
      if (newValue !== undefined && newValue !== null) {
        const oldValue = (campaign as any)[dbField];
        const processedNew = dbField === 'deadline' ? new Date(newValue) : newValue;

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

    // Perform the update
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Create all edit logs
    await this.prisma.campaignEditLog.createMany({ data: editLogs });

    return {
      campaign: updated,
      fieldsChanged: editLogs.length,
      changes: editLogs.map(l => ({ field: l.field_name, from: l.old_value, to: l.new_value })),
    };
  }

  // ──────────────────────────────────────────────
  // REVIEW HISTORY
  // ──────────────────────────────────────────────
  async getReviewHistory(bdUserId: string) {
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause: any = {
      status: { in: ['BD_APPROVED', 'BD_REVISION', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
      bd_reviewer_id: { not: null },
    };
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { bd_reviewed_at: 'desc' },
    });

    // Enrich with brand and BD reviewer names
    const userIds = [
      ...new Set([
        ...campaigns.map(c => c.brand_id),
        ...campaigns.filter(c => c.bd_reviewer_id).map(c => c.bd_reviewer_id!),
      ]),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return campaigns.map(c => ({
      ...c,
      brand_name: userMap.get(c.brand_id) || 'Unknown',
      bd_reviewer_name: c.bd_reviewer_id ? (userMap.get(c.bd_reviewer_id) || 'Unknown') : null,
    }));
  }

  // ──────────────────────────────────────────────
  // BD ANALYTICS
  // ──────────────────────────────────────────────
  async getAnalytics(bdUserId: string) {
    const assignedBrands = await this.getAssignedBrandIds(bdUserId);

    const whereClause: any = {};
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const allCampaigns = await this.prisma.campaign.findMany({ where: whereClause });

    // Approval rate
    const reviewed = allCampaigns.filter(c => ['BD_APPROVED', 'BD_REVISION', 'ACTIVE', 'COMPLETED'].includes(c.status));
    const approved = reviewed.filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status));
    const approvalRate = reviewed.length > 0 ? (approved.length / reviewed.length) * 100 : 0;

    // Budget by category
    const budgetByCategory: Record<string, number> = {};
    allCampaigns.forEach(c => {
      budgetByCategory[c.category] = (budgetByCategory[c.category] || 0) + c.budget;
    });

    // Campaigns by status
    const campaignsByStatus: Record<string, number> = {};
    allCampaigns.forEach(c => {
      campaignsByStatus[c.status] = (campaignsByStatus[c.status] || 0) + 1;
    });

    // Brand performance
    const brandIds = [...new Set(allCampaigns.map(c => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true },
    });
    const brandMap = new Map(brands.map(b => [b.id, b.name]));

    const brandPerformance = brandIds.map(bid => {
      const brandCampaigns = allCampaigns.filter(c => c.brand_id === bid);
      return {
        brand_id: bid,
        brand_name: brandMap.get(bid) || 'Unknown',
        totalCampaigns: brandCampaigns.length,
        totalBudget: brandCampaigns.reduce((sum, c) => sum + c.budget, 0),
        approvedCount: brandCampaigns.filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status)).length,
        pendingCount: brandCampaigns.filter(c => c.status === 'PENDING_BD').length,
      };
    });

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyTrend: { month: string; total: number; approved: number; budget: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = month.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      const monthCampaigns = allCampaigns.filter(c => {
        const d = new Date(c.created_at);
        return d >= month && d <= monthEnd;
      });

      monthlyTrend.push({
        month: monthStr,
        total: monthCampaigns.length,
        approved: monthCampaigns.filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status)).length,
        budget: monthCampaigns.reduce((sum, c) => sum + c.budget, 0),
      });
    }

    return {
      approvalRate: Math.round(approvalRate),
      totalReviewed: reviewed.length,
      totalApproved: approved.length,
      totalBudgetApproved: approved.reduce((sum, c) => sum + c.budget, 0),
      budgetByCategory,
      campaignsByStatus,
      brandPerformance,
      monthlyTrend,
    };
  }

  // ──────────────────────────────────────────────
  // BRAND ASSIGNMENT MANAGEMENT
  // ──────────────────────────────────────────────
  async assignBrand(bdUserId: string, brandUserId: string) {
    const existing = await this.prisma.brandBDAssignment.findUnique({
      where: { bd_user_id_brand_user_id: { bd_user_id: bdUserId, brand_user_id: brandUserId } },
    });

    if (existing) {
      // Reactivate if inactive
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

    const brandIds = assignments.map(a => a.brand_user_id);
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, email: true },
    });

    return assignments.map(a => ({
      ...a,
      brand: brands.find(b => b.id === a.brand_user_id) || { name: 'Unknown' },
    }));
  }

  // ── Helper: Get assigned brand IDs for a BD user ──
  private async getAssignedBrandIds(bdUserId: string): Promise<string[]> {
    // Check if user is ADMIN — admins see all campaigns
    const user = await this.prisma.user.findUnique({
      where: { id: bdUserId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') return []; // empty = no filter = see all

    const assignments = await this.prisma.brandBDAssignment.findMany({
      where: { bd_user_id: bdUserId, is_active: true },
      select: { brand_user_id: true },
    });
    return assignments.map(a => a.brand_user_id);
  }
}
