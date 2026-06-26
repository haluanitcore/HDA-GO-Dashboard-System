import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';


export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cm_id?: string; // Optional: CM assignment for Creator self-registration
}

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  email: string; // Can be email or username

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  refreshToken?: string;
}
