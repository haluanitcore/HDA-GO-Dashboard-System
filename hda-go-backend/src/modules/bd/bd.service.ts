import { Injectable } from '@nestjs/common';
import { BdCampaignService } from './bd-campaign.service';
import { BdHotelService } from './bd-hotel.service';
import { BdAnalyticsService } from './bd-analytics.service';
import { BdGmvImportService } from './bd-gmv-import.service';
import { BDEditCampaignDto } from './dto/bd-review.dto';
import type { HotelCreateDto, HotelVisitCreateDto } from './bd-hotel.service';

// ══════════════════════════════════════════════════════════════
// BD SERVICE — Orchestrator / Facade
//
// Delegates to sub-services for maintainability:
// - BdCampaignService  → Campaign CRUD, review, approve, assignments
// - BdHotelService     → Hotel partners, Excel upload, visits
// - BdAnalyticsService → Analytics dashboard
// - BdGmvImportService → GMV Excel import, Google Sheets sync
// ══════════════════════════════════════════════════════════════

@Injectable()
export class BdService {
  constructor(
    private campaignService: BdCampaignService,
    private hotelService: BdHotelService,
    private analyticsService: BdAnalyticsService,
    private gmvImportService: BdGmvImportService,
  ) {}

  // ── Campaign Operations ──
  getDashboard(bdUserId: string) {
    return this.campaignService.getDashboard(bdUserId);
  }

  getCampaignsByStatus(bdUserId: string, status: string) {
    return this.campaignService.getCampaignsByStatus(bdUserId, status);
  }

  getCampaignDetail(campaignId: string) {
    return this.campaignService.getCampaignDetail(campaignId);
  }

  approveCampaign(campaignId: string, bdUserId: string, notes?: string) {
    return this.campaignService.approveCampaign(campaignId, bdUserId, notes);
  }

  requestRevision(campaignId: string, bdUserId: string, notes: string) {
    return this.campaignService.requestRevision(campaignId, bdUserId, notes);
  }

  editCampaign(campaignId: string, bdUserId: string, dto: BDEditCampaignDto) {
    return this.campaignService.editCampaign(campaignId, bdUserId, dto);
  }

  getReviewHistory(bdUserId: string) {
    return this.campaignService.getReviewHistory(bdUserId);
  }

  submitNewDeal(bdUserId: string, dto: BDEditCampaignDto) {
    return this.campaignService.submitNewDeal(bdUserId, dto);
  }

  assignBrand(bdUserId: string, brandUserId: string) {
    return this.campaignService.assignBrand(bdUserId, brandUserId);
  }

  getAssignments(bdUserId: string) {
    return this.campaignService.getAssignments(bdUserId);
  }

  // ── Hotel Operations ──
  uploadHotelExcel(file: Express.Multer.File) {
    return this.hotelService.uploadHotelExcel(file);
  }

  getHotels() {
    return this.hotelService.getHotels();
  }

  createHotel(dto: HotelCreateDto) {
    return this.hotelService.createHotel(dto);
  }

  createHotelVisit(dto: HotelVisitCreateDto) {
    return this.hotelService.createHotelVisit(dto);
  }

  updateHotelVisitStatus(visitId: string, status: string, notes?: string) {
    return this.hotelService.updateHotelVisitStatus(visitId, status, notes);
  }

  getHotelVisits(campaignId?: string) {
    return this.hotelService.getHotelVisits(campaignId);
  }

  // ── Analytics ──
  getAnalytics(bdUserId: string) {
    return this.analyticsService.getAnalytics(bdUserId);
  }

  // ── GMV Import ──
  uploadCreatorGmvExcel(file: Express.Multer.File) {
    return this.gmvImportService.uploadCreatorGmvExcel(file);
  }

  syncGoogleSpreadsheet() {
    return this.gmvImportService.syncGoogleSpreadsheet();
  }

  getWeeklyStats(week?: string) {
    return this.gmvImportService.getWeeklyStats(week);
  }

  getUnregisteredCreators() {
    return this.gmvImportService.getUnregisteredCreators();
  }

  sendWeeklySyncReminder() {
    return this.gmvImportService.sendWeeklySyncReminder();
  }
}
