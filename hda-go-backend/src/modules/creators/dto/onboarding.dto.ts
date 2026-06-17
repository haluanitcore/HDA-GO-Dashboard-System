import { IsString, MaxLength, IsOptional, IsNumber, Min, IsDateString, IsIn } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  tiktok_url?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tiktok_followers?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  avg_views?: number;

  @IsDateString()
  @IsOptional()
  birth_date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  niche?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  domicile?: string;

  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: string;

  // Additional fields required by completeOnboarding service if we pass the whole DTO:
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  tiktok_username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  affiliate_exp?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cm_id?: string;
}
