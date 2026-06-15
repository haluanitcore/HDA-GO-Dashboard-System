import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsNumber,
} from 'class-validator';

// ══════════════════════════════════════════════════
// BD REVIEW DTOs
// Used for approving, revising, and editing campaigns
// ══════════════════════════════════════════════════

export class BDReviewDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BDEditCampaignDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  min_level?: number;

  @IsOptional()
  @IsInt()
  sow_total?: number;

  @IsOptional()
  @IsString()
  reward_type?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsInt()
  slot?: number;

  @IsOptional()
  @IsString()
  brief_url?: string;

  @IsOptional()
  @IsString()
  notes?: string; // Edit reason / notes

  // Phase 2 fields
  @IsOptional()
  @IsString()
  collaboration_type?: string; // VISIT_ONLY, BARTER_STAY, BARTER_DINING

  @IsOptional()
  @IsInt()
  target_creators_count?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pic_contact?: string;

  @IsOptional()
  @IsString()
  brief_text?: string;
}

export class BDAssignBrandDto {
  @IsNotEmpty()
  @IsString()
  brand_user_id: string;

  @IsNotEmpty()
  @IsString()
  bd_user_id: string;
}

// ══════════════════════════════════════════════════
// BD SUBMIT NEW DEAL DTO — Phase 2
// Used for BD creating new hotel campaign deals
// ══════════════════════════════════════════════════

export class BDSubmitDealDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  category: string; // HOTEL, FNB, TTD, LIVE, BEAUTY, TECH

  @IsNotEmpty()
  @IsString()
  brand_id: string;

  @IsOptional()
  @IsInt()
  sow_total?: number;

  @IsOptional()
  @IsString()
  reward_type?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsInt()
  slot?: number;

  @IsOptional()
  @IsString()
  brief_url?: string;

  @IsOptional()
  @IsString()
  collaboration_type?: string;

  @IsOptional()
  @IsInt()
  target_creators_count?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pic_contact?: string;

  @IsOptional()
  @IsString()
  brief_text?: string;
}
