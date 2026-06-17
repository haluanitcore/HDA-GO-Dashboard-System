import { IsOptional, IsString, IsUrl, MaxLength, IsIn } from 'class-validator';

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsUrl()
  tiktok_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  niche?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  domicile?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
