import { IsNotEmpty, IsString, IsInt, IsDateString, IsOptional, IsIn } from 'class-validator';

export const CAMPAIGN_CATEGORIES = ['HOTEL', 'FNB', 'TTD', 'LIVE', 'BEAUTY', 'TECH'] as const;

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsIn(CAMPAIGN_CATEGORIES)
  category: string;

  @IsInt()
  min_level: number;

  @IsNotEmpty()
  @IsString()
  brand_id: string;

  @IsInt()
  sow_total: number;

  @IsNotEmpty()
  @IsString()
  reward_type: string; // FIXED, COMMISSION

  @IsDateString()
  deadline: string;

  @IsInt()
  slot: number; // Max participants

  @IsOptional()
  @IsString()
  status?: string;
}

export class JoinCampaignDto {
  @IsNotEmpty()
  @IsString()
  campaign_id: string;
}

export class CampaignFilterDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  min_level?: number;
}
