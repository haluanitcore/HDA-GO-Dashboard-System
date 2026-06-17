import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateSubmissionUploadDto {
  @IsNotEmpty()
  @IsString()
  campaign_id: string;

  @IsNotEmpty()
  @IsString()
  total_sow: string; // Comes as string from multipart form-data, parsed to int in service
}

export class ReviewSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['APPROVED', 'REVISION', 'REJECTED'])
  status: string; // APPROVED, REVISION, REJECTED

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  qc_notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  quality_score?: number;

  @IsOptional()
  @IsString()
  checked_items?: string; // stringified JSON checklist state

  @IsOptional()
  @IsString()
  qc_issues?: string; // stringified JSON list of issues

  @IsOptional()
  @IsString()
  internal_tags?: string; // stringified JSON array of tags

  @IsOptional()
  @IsString()
  schedule_posting?: string; // ISO date string


}

export class BulkReviewDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  submissionIds: string[];

  @IsNotEmpty()
  @IsString()
  @IsIn(['APPROVED', 'REVISION', 'REJECTED'])
  status: string; // APPROVED, REVISION, REJECTED

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  qc_notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  qc_issues?: string; // JSON

  @IsOptional()
  @IsString()
  internal_tags?: string; // JSON

  @IsOptional()
  @IsString()
  schedule_posting?: string; // ISO date string


}

export class SubmitVtLinkDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  tiktok_vt_link: string;
}
