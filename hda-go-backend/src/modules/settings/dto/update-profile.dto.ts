import { IsString, MaxLength, IsOptional, IsUrl, MinLength } from 'class-validator';

export class UpdateSettingsProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsUrl()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

