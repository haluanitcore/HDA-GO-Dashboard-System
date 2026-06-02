import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { BDEditCampaignDto } from './dto/bd-review.dto';
import { LevelsService } from '../levels/levels.service';

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
    private levelsService: LevelsService,
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
      include: {
        _count: {
          select: { participants: true, submissions: true },
        },
      },
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
      target_creators_count: 'target_creators_count',
      collaboration_type: 'collaboration_type',
      start_date: 'start_date',
      description: 'description',
      pic_contact: 'pic_contact',
      brief_text: 'brief_text',
    };

    for (const [dtoField, dbField] of Object.entries(fieldMap)) {
      const newValue = (dto as any)[dtoField];
      if (newValue !== undefined && newValue !== null) {
        const oldValue = (campaign as any)[dbField];
        const processedNew = (dbField === 'deadline' || dbField === 'start_date') && newValue 
          ? new Date(newValue) 
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

  // ══════════════════════════════════════════════════
  // PHASE 2: SUBMIT NEW DEAL — BD Creates Campaign
  // ══════════════════════════════════════════════════
  async submitNewDeal(bdUserId: string, dto: any) {
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title,
        category: dto.category,
        brand_id: dto.brand_id,
        sow_total: dto.sow_total || 0,
        reward_type: dto.reward_type || 'FIXED',
        deadline: dto.deadline 
          ? new Date(dto.deadline) 
          : dto.start_date 
            ? new Date(new Date(dto.start_date).getTime() + 30 * 24 * 60 * 60 * 1000) 
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

    // Create edit log for deal creation
    await this.prisma.campaignEditLog.create({
      data: {
        campaign_id: campaign.id,
        editor_id: bdUserId,
        editor_role: 'BD',
        field_name: 'status',
        old_value: '',
        new_value: 'PENDING_BD',
        action: 'CREATE',
        notes: `New deal created: ${dto.title}`,
      },
    });

    return { success: true, campaign };
  }

  // ══════════════════════════════════════════════════
  // PHASE 2: HOTEL PARTNERS — Excel Upload & CRUD
  // ══════════════════════════════════════════════════
  async uploadHotelExcel(file: Express.Multer.File) {
    const fs = require('fs');
    const filePath = file.path;

    try {
      // Read file and parse CSV/Tab-separated format
      // Expected columns: name, location, city, category, facilities, contact
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line: string) => line.trim().length > 0);

      if (lines.length < 2) {
        throw new BadRequestException('File harus memiliki header dan minimal 1 baris data');
      }

      // Detect separator (tab or comma)
      const header = lines[0];
      const separator = header.includes('\t') ? '\t' : ',';
      const headers = header.split(separator).map((h: string) => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));

      const results: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c: string) => c.trim());
        const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('nama') !== -1 ? headers.indexOf('nama') : 0;
        const locationIdx = headers.indexOf('location') !== -1 ? headers.indexOf('location') : headers.indexOf('lokasi') !== -1 ? headers.indexOf('lokasi') : 1;
        const cityIdx = headers.indexOf('city') !== -1 ? headers.indexOf('city') : headers.indexOf('kota') !== -1 ? headers.indexOf('kota') : 2;
        const categoryIdx = headers.indexOf('category') !== -1 ? headers.indexOf('category') : headers.indexOf('kategori') !== -1 ? headers.indexOf('kategori') : 3;
        const facilitiesIdx = headers.indexOf('facilities') !== -1 ? headers.indexOf('facilities') : headers.indexOf('fasilitas') !== -1 ? headers.indexOf('fasilitas') : 4;
        const contactIdx = headers.indexOf('contact') !== -1 ? headers.indexOf('contact') : headers.indexOf('kontak') !== -1 ? headers.indexOf('kontak') : 5;

        const provinceIdx = headers.indexOf('province') !== -1 ? headers.indexOf('province') : headers.indexOf('provinsi') !== -1 ? headers.indexOf('provinsi') : -1;
        const quotaIdx = headers.indexOf('quota') !== -1 ? headers.indexOf('quota') : headers.indexOf('kuota') !== -1 ? headers.indexOf('kuota') : -1;
        const picNameIdx = headers.indexOf('pic_name') !== -1 ? headers.indexOf('pic_name') : headers.indexOf('nama_pic') !== -1 ? headers.indexOf('nama_pic') : headers.indexOf('pic') !== -1 ? headers.indexOf('pic') : -1;
        const picPhoneIdx = headers.indexOf('pic_phone') !== -1 ? headers.indexOf('pic_phone') : headers.indexOf('no_wa') !== -1 ? headers.indexOf('no_wa') : headers.indexOf('whatsapp') !== -1 ? headers.indexOf('whatsapp') : -1;

        if (!cols[nameIdx] || !cols[locationIdx]) continue; // skip empty rows

        const hotel = await this.prisma.hotelPartner.create({
          data: {
            name: cols[nameIdx] || '',
            location: cols[locationIdx] || '',
            city: cols[cityIdx] || null,
            category: cols[categoryIdx] || 'HOTEL',
            facilities: cols[facilitiesIdx] || null,
            contact: cols[contactIdx] || null,
            province: provinceIdx !== -1 && cols[provinceIdx] ? cols[provinceIdx] : null,
            quota: quotaIdx !== -1 && cols[quotaIdx] ? Number(cols[quotaIdx]) : 1,
            pic_name: picNameIdx !== -1 && cols[picNameIdx] ? cols[picNameIdx] : null,
            pic_phone: picPhoneIdx !== -1 && cols[picPhoneIdx] ? cols[picPhoneIdx] : null,
          },
        });
        results.push(hotel);
      }

      // Clean up temp file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      return { success: true, imported: results.length, hotels: results };
    } catch (err) {
      // Clean up temp file on error
      const fs2 = require('fs');
      if (fs2.existsSync(filePath)) fs2.unlinkSync(filePath);
      throw err;
    }
  }

  async getHotels() {
    const hotels = await this.prisma.hotelPartner.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
    return { total: hotels.length, hotels };
  }

  async createHotel(dto: any) {
    const hotel = await this.prisma.hotelPartner.create({
      data: {
        name: dto.name,
        location: dto.location,
        city: dto.city || null,
        category: dto.category || 'HOTEL',
        facilities: dto.facilities ? JSON.stringify(dto.facilities) : null,
        contact: dto.contact || null,
        province: dto.province || null,
        quota: dto.quota !== undefined ? Number(dto.quota) : 1,
        pic_name: dto.pic_name || null,
        pic_phone: dto.pic_phone || null,
      },
    });
    return { success: true, hotel };
  }

  // ══════════════════════════════════════════════════
  // PHASE 2: HOTEL VISIT WORKFLOW
  // BD schedules visits → Creator visits hotel → BD marks completed
  // ══════════════════════════════════════════════════
  async createHotelVisit(dto: any) {
    const visit = await this.prisma.hotelVisit.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: dto.creator_id,
        hotel_id: dto.hotel_id,
        visit_type: dto.visit_type,
        visit_date: new Date(dto.visit_date),
        visit_time: dto.visit_time || '10:00',
        visit_location: dto.visit_location || null,
        status: 'PENDING',
        notes: dto.notes || null,
      },
    });
    return { success: true, visit };
  }

  async updateHotelVisitStatus(visitId: string, status: string, notes?: string) {
    const visit = await this.prisma.hotelVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Hotel visit not found');

    const updated = await this.prisma.hotelVisit.update({
      where: { id: visitId },
      data: { status, notes: notes || visit.notes },
    });
    return { success: true, visit: updated };
  }

  async getHotelVisits(campaignId?: string) {
    const where: any = {};
    if (campaignId) where.campaign_id = campaignId;

    const visits = await this.prisma.hotelVisit.findMany({
      where,
      include: {
        hotel: true,
        creator: { include: { user: { select: { name: true } } } },
        campaign: { select: { title: true, category: true } },
      },
      orderBy: { visit_date: 'desc' },
    });

    return { total: visits.length, visits };
  }

  // ══════════════════════════════════════════════════
  // BULK EXCEL CREATOR GMV & ORDERS IMPORTER
  // ══════════════════════════════════════════════════
  async uploadCreatorGmvExcel(file: Express.Multer.File) {
    const fs = require('fs');
    const XLSX = require('xlsx');
    const filePath = file.path;

    try {
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('Berkas Excel tidak ditemukan');
      }

      const workbook = XLSX.readFile(filePath);
      
      // Dynamic header mapping helpers
      const findKey = (row: any, patterns: string[]) => {
        const keys = Object.keys(row);
        for (const pattern of patterns) {
          const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pattern));
          if (matchedKey) return matchedKey;
        }
        return null;
      };

      // Let's find the worksheet that actually contains Creator/Username and GMV columns dynamically!
      let worksheet = null;
      let sheetName = "";
      let rows: any[] = [];
      let usernameKey: string | null = null;
      let gmvKey: string | null = null;
      let ordersKey: string | null = null;
      let periodKey: string | null = null;

      for (const name of workbook.SheetNames) {
        const ws = workbook.Sheets[name];
        const tempRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (tempRows.length > 0) {
          const sampleRow = tempRows[0];
          const uKey = findKey(sampleRow, ['username', 'creator', 'kreator', 'nama']);
          const gKey = findKey(sampleRow, ['gmv', 'omset', 'penjualan', 'salesamount', 'salesvalue']);
          
          // If we found a sheet with both columns, select it!
          if (uKey && gKey) {
            worksheet = ws;
            sheetName = name;
            rows = tempRows;
            usernameKey = uKey;
            gmvKey = gKey;
            ordersKey = findKey(sampleRow, ['order', 'pesanan', 'sales', 'ordercount']);
            periodKey = findKey(sampleRow, ['periode', 'bulan', 'month', 'date', 'tanggal']);
            break;
          }
        }
      }

      if (!worksheet) {
        // Fallback to the first sheet if no auto-match was found
        sheetName = workbook.SheetNames[0];
        worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rows.length === 0) {
          throw new BadRequestException('Excel tidak mengandung data atau kosong');
        }

        const sampleRow = rows[0];
        usernameKey = findKey(sampleRow, ['username', 'creator', 'kreator', 'nama']);
        gmvKey = findKey(sampleRow, ['gmv', 'omset', 'penjualan', 'salesamount', 'salesvalue']);
        ordersKey = findKey(sampleRow, ['order', 'pesanan', 'sales', 'ordercount']);
        periodKey = findKey(sampleRow, ['periode', 'bulan', 'month', 'date', 'tanggal']);
      }

      if (!usernameKey) {
        throw new BadRequestException('Kolom Username TikTok tidak ditemukan di Excel. Pastikan ada kolom "Username", "Creator", atau "Nama".');
      }

      if (!gmvKey) {
        throw new BadRequestException('Kolom GMV tidak ditemukan di Excel. Pastikan ada kolom "GMV", "Omset", atau "Penjualan".');
      }

      const uKey = usernameKey;
      const gKey = gmvKey;
      const oKey = ordersKey;
      const pKey = periodKey;

      // Self-healing default campaign for referential integrity
      let campaign = await this.prisma.campaign.findFirst({
        where: { status: 'ACTIVE' }
      });
      if (!campaign) {
        campaign = await this.prisma.campaign.findFirst();
      }
      if (!campaign) {
        campaign = await this.prisma.campaign.create({
          data: {
            title: 'Excel Import Campaign Tracking',
            category: 'HOTEL',
            sow_total: 1,
            reward_type: 'COMMISSION',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            brand_id: 'default-brand-id',
          }
        });
      }
      const campaignId = campaign.id;

      // Current Month as default period: "YYYY-MM"
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let totalUpdated = 0;
      let totalGmvAdded = 0;
      let totalOrdersAdded = 0;
      const leveledUpCreators: any[] = [];
      const skippedRows: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let username = String(row[uKey]).trim();
        
        // Clean username from @ prefix and spaces
        if (username.startsWith('@')) {
          username = username.substring(1).trim();
        }

        if (!username) {
          skippedRows.push({
            row: i + 2,
            username: '',
            reason: 'Username kosong'
          });
          continue;
        }

        // Parse GMV
        let rawGmv = String(row[gKey] || '0').trim();
        let cleanedGmvStr = rawGmv.replace(/[^\d.,]/g, '');
        let parsedGmv = 0;

        if (cleanedGmvStr.includes(',') && cleanedGmvStr.includes('.')) {
          if (cleanedGmvStr.indexOf(',') > cleanedGmvStr.indexOf('.')) {
            cleanedGmvStr = cleanedGmvStr.replace(/\./g, '').replace(/,/g, '.');
          } else {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
          }
        } else if (cleanedGmvStr.includes(',')) {
          const parts = cleanedGmvStr.split(',');
          if (parts[parts.length - 1].length === 3) {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
          } else {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '.');
          }
        } else if (cleanedGmvStr.includes('.')) {
          const parts = cleanedGmvStr.split('.');
          if (parts[parts.length - 1].length === 3) {
            cleanedGmvStr = cleanedGmvStr.replace(/\./g, '');
          }
        }
        parsedGmv = parseFloat(cleanedGmvStr) || 0;

        // Parse Orders
        let parsedOrders = 0;
        if (oKey && row[oKey] !== undefined && row[oKey] !== '') {
          const rawOrders = String(row[oKey]).replace(/[^\d]/g, '');
          parsedOrders = parseInt(rawOrders, 10) || 0;
        } else {
          // Smart fallback: assume average basket size of Rp 100,000 if Orders is missing
          parsedOrders = Math.floor(parsedGmv / 100000) || 1;
        }

        // Parse Period
        let parsedPeriod = currentPeriod;
        if (pKey && row[pKey]) {
          const rawPeriod = String(row[pKey]).trim();
          const match = rawPeriod.match(/(\d{4})[-/](\d{2})/);
          if (match) {
            parsedPeriod = `${match[1]}-${match[2]}`;
          }
        }

        // Safe case-insensitive equivalent find for SQLite
        const creator = await this.prisma.creator.findFirst({
          where: {
            OR: [
              { tiktok_username: username },
              { tiktok_username: username.toLowerCase() },
              { tiktok_username: username.toUpperCase() },
            ]
          },
          include: { user: true }
        });

        if (!creator) {
          skippedRows.push({
            row: i + 2,
            username: username,
            reason: `Username TikTok "${username}" tidak terdaftar di sistem HDA-GO`
          });
          continue;
        }

        // Record the transaction as verified BD order upload
        await this.prisma.creatorOrder.create({
          data: {
            creator_id: creator.user_id,
            campaign_id: campaignId,
            order_count: parsedOrders,
            gmv_amount: parsedGmv,
            source: 'EXCEL_UPLOAD_BD',
            status: 'VERIFIED',
            period_date: new Date(),
            notes: `Bulk GMV Excel upload by BD for period ${parsedPeriod}. Row ${i + 2}`,
          }
        });

        // Record monthly stats
        await this.prisma.creatorMonthlyStats.upsert({
          where: {
            creator_id_month: {
              creator_id: creator.user_id,
              month: parsedPeriod,
            }
          },
          update: {
            gmv: { increment: parsedGmv },
            orders: { increment: parsedOrders },
          },
          create: {
            creator_id: creator.user_id,
            month: parsedPeriod,
            gmv: parsedGmv,
            orders: parsedOrders,
          }
        });

        // Update aggregates on Creator table
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: {
            gmv_total: { increment: parsedGmv },
            gmv_monthly: { increment: parsedGmv },
            total_orders: { increment: parsedOrders },
          }
        });

        // Recalculate levels using the Level Up Engine
        const evalResult = await this.levelsService.evaluateLevel(creator.user_id);
        if (evalResult && evalResult.leveledUp) {
          leveledUpCreators.push({
            id: creator.user_id,
            name: creator.user.name,
            username: creator.tiktok_username,
            oldLevel: evalResult.previousLevel,
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });

          // Pemicu Websocket real-time event to creator
          this.eventsGateway.emitLevelUp(creator.user_id, {
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });
        }

        totalUpdated++;
        totalGmvAdded += parsedGmv;
        totalOrdersAdded += parsedOrders;
      }

      // Clean up uploaded temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: true,
        message: `Berhasil memproses Excel GMV & Orders`,
        summary: {
          total_rows_processed: rows.length,
          total_updated_creators: totalUpdated,
          total_gmv_added: totalGmvAdded,
          total_orders_added: totalOrdersAdded,
        },
        leveled_up_creators: leveledUpCreators,
        skipped_rows: skippedRows,
      };

    } catch (err) {
      // Clean up temp file on error
      const fs2 = require('fs');
      if (fs2.existsSync(filePath)) {
        fs2.unlinkSync(filePath);
      }
      throw err;
    }
  }

  // ══════════════════════════════════════════════════
  // DIRECT LIVE GOOGLE SHEETS SINKRONISASI (AUTO-SYNC API)
  // ══════════════════════════════════════════════════
  async syncGoogleSpreadsheet() {
    try {
      const url = 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc/export?format=csv&gid=1505444998';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new BadRequestException('Gagal mengunduh data dari Google Sheets. Pastikan Spreadsheet dibagikan secara publik (Anyone with the link can view).');
      }
      
      const csvContent = await response.text();
      if (!csvContent || csvContent.trim().length === 0) {
        throw new BadRequestException('Data dari Google Sheets kosong');
      }

      // Robust quote-aware state-machine CSV parser
      const parseCSV = (content: string): string[][] => {
        const result: string[][] = [];
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          const row: string[] = [];
          let inQuotes = false;
          let currentField = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(currentField.trim());
              currentField = '';
            } else {
              currentField += char;
            }
          }
          row.push(currentField.trim());
          result.push(row.map(r => r.replace(/^"|"$/g, '').trim()));
        }
        return result;
      };

      const parsedRows = parseCSV(csvContent);
      if (parsedRows.length < 2) {
        throw new BadRequestException('Format Google Sheets tidak valid. Harus memiliki minimal 1 baris tajuk dan 1 baris data.');
      }

      const headers = parsedRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      // Look for Username and GMV columns
      const findIndex = (patterns: string[]) => {
        for (const pattern of patterns) {
          const idx = headers.findIndex(h => h.includes(pattern));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const usernameIdx = findIndex(['username', 'creator', 'kreator', 'nama']);
      const gmvIdx = findIndex(['gmv', 'omset', 'penjualan', 'salesamount', 'salesvalue']);
      const ordersIdx = findIndex(['order', 'pesanan', 'sales', 'ordercount']);
      const periodIdx = findIndex(['periode', 'bulan', 'month', 'date', 'tanggal']);

      if (usernameIdx === -1) {
        throw new BadRequestException('Kolom Username TikTok tidak ditemukan pada Google Sheets. Pastikan ada kolom "Username", "Creator", atau "Nama".');
      }

      if (gmvIdx === -1) {
        throw new BadRequestException('Kolom GMV tidak ditemukan pada Google Sheets. Pastikan ada kolom "GMV", "Omset", atau "Penjualan".');
      }

      // Self-healing default campaign for referential integrity
      let campaign = await this.prisma.campaign.findFirst({
        where: { status: 'ACTIVE' }
      });
      if (!campaign) {
        campaign = await this.prisma.campaign.findFirst();
      }
      if (!campaign) {
        campaign = await this.prisma.campaign.create({
          data: {
            title: 'Google Sheet Sync Campaign Tracking',
            category: 'HOTEL',
            sow_total: 1,
            reward_type: 'COMMISSION',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            brand_id: 'default-brand-id',
          }
        });
      }
      const campaignId = campaign.id;

      // Current Month as default period: "YYYY-MM"
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let totalUpdated = 0;
      let totalGmvAdded = 0;
      let totalOrdersAdded = 0;
      const leveledUpCreators: any[] = [];
      const skippedRows: any[] = [];

      for (let i = 1; i < parsedRows.length; i++) {
        const cols = parsedRows[i];
        let username = String(cols[usernameIdx] || '').trim();
        
        // Clean username from @ prefix and spaces
        if (username.startsWith('@')) {
          username = username.substring(1).trim();
        }

        if (!username) {
          skippedRows.push({
            row: i + 1,
            username: '',
            reason: 'Username kosong'
          });
          continue;
        }

        // Parse GMV
        let rawGmv = String(cols[gmvIdx] || '0').trim();
        let cleanedGmvStr = rawGmv.replace(/[^\d.,]/g, '');
        let parsedGmv = 0;

        if (cleanedGmvStr.includes(',') && cleanedGmvStr.includes('.')) {
          if (cleanedGmvStr.indexOf(',') > cleanedGmvStr.indexOf('.')) {
            cleanedGmvStr = cleanedGmvStr.replace(/\./g, '').replace(/,/g, '.');
          } else {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
          }
        } else if (cleanedGmvStr.includes(',')) {
          const parts = cleanedGmvStr.split(',');
          if (parts[parts.length - 1].length === 3) {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
          } else {
            cleanedGmvStr = cleanedGmvStr.replace(/,/g, '.');
          }
        } else if (cleanedGmvStr.includes('.')) {
          const parts = cleanedGmvStr.split('.');
          if (parts[parts.length - 1].length === 3) {
            cleanedGmvStr = cleanedGmvStr.replace(/\./g, '');
          }
        }
        parsedGmv = parseFloat(cleanedGmvStr) || 0;

        // Parse Orders
        let parsedOrders = 0;
        if (ordersIdx !== -1 && cols[ordersIdx] !== undefined && cols[ordersIdx] !== '') {
          const rawOrders = String(cols[ordersIdx]).replace(/[^\d]/g, '');
          parsedOrders = parseInt(rawOrders, 10) || 0;
        } else {
          // Smart fallback: assume average basket size of Rp 100,000 if Orders is missing
          parsedOrders = Math.floor(parsedGmv / 100000) || 1;
        }

        // Parse Period
        let parsedPeriod = currentPeriod;
        if (periodIdx !== -1 && cols[periodIdx]) {
          const rawPeriod = String(cols[periodIdx]).trim();
          const match = rawPeriod.match(/(\d{4})[-/](\d{2})/);
          if (match) {
            parsedPeriod = `${match[1]}-${match[2]}`;
          }
        }

        // Safe case-insensitive equivalent find for SQLite
        const creator = await this.prisma.creator.findFirst({
          where: {
            OR: [
              { tiktok_username: username },
              { tiktok_username: username.toLowerCase() },
              { tiktok_username: username.toUpperCase() },
            ]
          },
          include: { user: true }
        });

        if (!creator) {
          skippedRows.push({
            row: i + 1,
            username: username,
            reason: `Username TikTok "${username}" tidak terdaftar di sistem HDA-GO`
          });
          continue;
        }

        // Record the transaction as verified BD order upload
        await this.prisma.creatorOrder.create({
          data: {
            creator_id: creator.user_id,
            campaign_id: campaignId,
            order_count: parsedOrders,
            gmv_amount: parsedGmv,
            source: 'EXCEL_UPLOAD_BD',
            status: 'VERIFIED',
            period_date: new Date(),
            notes: `Auto Sync with Google Sheets for period ${parsedPeriod}. Row ${i + 1}`,
          }
        });

        // Record monthly stats
        await this.prisma.creatorMonthlyStats.upsert({
          where: {
            creator_id_month: {
              creator_id: creator.user_id,
              month: parsedPeriod,
            }
          },
          update: {
            gmv: { increment: parsedGmv },
            orders: { increment: parsedOrders },
          },
          create: {
            creator_id: creator.user_id,
            month: parsedPeriod,
            gmv: parsedGmv,
            orders: parsedOrders,
          }
        });

        // Update aggregates on Creator table
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: {
            gmv_total: { increment: parsedGmv },
            gmv_monthly: { increment: parsedGmv },
            total_orders: { increment: parsedOrders },
          }
        });

        // Recalculate levels using the Level Up Engine
        const evalResult = await this.levelsService.evaluateLevel(creator.user_id);
        if (evalResult && evalResult.leveledUp) {
          leveledUpCreators.push({
            id: creator.user_id,
            name: creator.user.name,
            username: creator.tiktok_username,
            oldLevel: evalResult.previousLevel,
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });

          // Pemicu Websocket real-time event to creator
          this.eventsGateway.emitLevelUp(creator.user_id, {
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });
        }

        totalUpdated++;
        totalGmvAdded += parsedGmv;
        totalOrdersAdded += parsedOrders;
      }

      return {
        success: true,
        message: `Berhasil menyinkronkan data dengan Google Sheets!`,
        summary: {
          total_rows_processed: parsedRows.length - 1,
          total_updated_creators: totalUpdated,
          total_gmv_added: totalGmvAdded,
          total_orders_added: totalOrdersAdded,
        },
        leveled_up_creators: leveledUpCreators,
        skipped_rows: skippedRows,
      };

    } catch (err) {
      throw err;
    }
  }
}
