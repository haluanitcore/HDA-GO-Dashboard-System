import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export const CAMPAIGN_CATEGORIES = [
  'HOTEL',
  'FNB',
  'TTD',
  'LIVE',
  'BEAUTY',
  'TECH',
] as const;

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsIn(CAMPAIGN_CATEGORIES)
  category: string;

  @IsInt()
  min_level: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  brand_id: string;

  @IsInt()
  sow_total: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  reward_type: string; // FIXED, COMMISSION

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsInt()
  slot: number; // Max participants

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @IsOptional()
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  brief_url?: string; // PDF brief attachment link

  @IsOptional()
  @IsInt()
  target_creators_count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  collaboration_type?: string;

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

export class JoinCampaignDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  campaign_id: string;
}

export class CampaignFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @IsOptional()
  @IsInt()
  min_level?: number;
}
