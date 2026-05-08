import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateSubmissionDto {
  @IsNotEmpty()
  @IsString()
  campaign_id: string;

  @IsNotEmpty()
  @IsString()
  tiktok_url: string;

  @IsInt()
  total_sow: number;
}

export class ReviewSubmissionDto {
  @IsNotEmpty()
  @IsString()
  status: string; // APPROVED, REVISE, REJECTED

  @IsOptional()
  @IsString()
  qc_notes?: string;
}
