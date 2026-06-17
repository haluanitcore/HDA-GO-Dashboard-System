import { IsDateString, IsString, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateHotelVisitDto {
  @IsString()
  @MaxLength(100)
  campaign_id: string;

  @IsString()
  @MaxLength(100)
  creator_id: string;

  @IsString()
  @MaxLength(100)
  hotel_id: string;

  @IsString()
  @MaxLength(100)
  visit_type: string;

  @IsDateString()
  visit_date: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  visit_time?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  visit_location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  purpose?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateHotelVisitDto {
  @IsString()
  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  status: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
