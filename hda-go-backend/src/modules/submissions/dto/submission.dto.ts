import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

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
  status: string; // APPROVED, REVISION

  @IsOptional()
  @IsString()
  qc_notes?: string;
}
