import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString, IsIn, IsNumber } from 'class-validator';

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
  notes?: string;  // Edit reason / notes
}

export class BDAssignBrandDto {
  @IsNotEmpty()
  @IsString()
  brand_user_id: string;

  @IsNotEmpty()
  @IsString()
  bd_user_id: string;
}
