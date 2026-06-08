import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
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
  status: string; // APPROVED, REVISION, REJECTED

  @IsOptional()
  @IsString()
  qc_notes?: string;

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

  @IsOptional()
  @IsString()
  reviewer_id?: string;
}

export class BulkReviewDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  submissionIds: string[];

  @IsNotEmpty()
  @IsString()
  status: string; // APPROVED, REVISION, REJECTED

  @IsOptional()
  @IsString()
  qc_notes?: string;

  @IsOptional()
  @IsString()
  qc_issues?: string; // JSON

  @IsOptional()
  @IsString()
  internal_tags?: string; // JSON

  @IsOptional()
  @IsString()
  schedule_posting?: string; // ISO date string

  @IsOptional()
  @IsString()
  reviewer_id?: string;
}
