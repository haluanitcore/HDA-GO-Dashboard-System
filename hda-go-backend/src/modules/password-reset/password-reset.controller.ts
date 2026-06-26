import { Controller, Post, Body } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.passwordResetService.requestReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(body.token, body.newPassword);
  }
}