import {
  IsNumber,
  Min,
  IsDateString,
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';

export class SelfReportGmvDto {
  @IsNumber()
  @Min(0)
  gmvAmount: number;

  @IsNumber()
  @Min(0)
  orderCount: number;

  @IsDateString()
  periodDate: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  platform?: string;
}

export class VerifyGmvDto {
  @IsString()
  @IsIn(['APPROVE', 'ADJUST', 'REJECT'])
  action: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustedAmount?: number;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  rejectReason?: string;
}
