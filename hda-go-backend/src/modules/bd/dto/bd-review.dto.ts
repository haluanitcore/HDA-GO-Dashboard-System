import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsNumber,
  MaxLength,
  IsUrl,
  IsArray,
  Min,
} from 'class-validator';

// ══════════════════════════════════════════════════
// BD REVIEW DTOs
// Used for approving, revising, and editing campaigns
// ══════════════════════════════════════════════════

export class BDReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class BDEditCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsInt()
  min_level?: number;

  @IsOptional()
  @IsInt()
  sow_total?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(500)
  brief_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string; // Edit reason / notes

  // Phase 2 fields
  @IsOptional()
  @IsString()
  @MaxLength(100)
  collaboration_type?: string; // VISIT_ONLY, BARTER_STAY, BARTER_DINING

  @IsOptional()
  @IsInt()
  target_creators_count?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pic_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brief_text?: string;
}

export class BDAssignBrandDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  brand_user_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  bd_user_id: string;
}

// ══════════════════════════════════════════════════
// BD SUBMIT NEW DEAL DTO — Phase 2
// Used for BD creating new hotel campaign deals
// ══════════════════════════════════════════════════

export class BDSubmitDealDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  category: string; // HOTEL, FNB, TTD, LIVE, BEAUTY, TECH

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  brand_id: string;

  @IsOptional()
  @IsInt()
  sow_total?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(500)
  brief_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  collaboration_type?: string;

  @IsOptional()
  @IsInt()
  target_creators_count?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pic_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brief_text?: string;
}

export class CreateHotelDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  facilities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quota?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pic_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pic_phone?: string;
}
