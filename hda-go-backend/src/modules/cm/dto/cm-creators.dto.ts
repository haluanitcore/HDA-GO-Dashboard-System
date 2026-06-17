import {
  IsEmail,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class OnboardCreatorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  creator_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domicile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tiktok_username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok_url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiktok_followers?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avg_views?: number;

  @IsOptional()
  @IsArray()
  niche?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  affiliate_exp?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sow_per_month?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gmv_target_monthly?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cm_notes?: string;
}

export class TransferCreatorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  target_cm_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class PushRecommendationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  creator_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  campaign_id: string;
}

export class AssignCreatorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  creator_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  cm_id: string;
}

export class SubmitVtLinkDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  tiktok_vt_link: string;
}

export class UpdateCreatorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  creator_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domicile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tiktok_username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok_url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiktok_followers?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avg_views?: number;

  @IsOptional()
  @IsArray()
  niche?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  affiliate_exp?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sow_per_month?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gmv_target_monthly?: number;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cm_notes?: string;
}
