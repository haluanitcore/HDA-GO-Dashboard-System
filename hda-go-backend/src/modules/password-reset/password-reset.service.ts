import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { BCRYPT_ROUNDS } from '../../common/constants';

@Injectable()
export class PasswordResetService {
  constructor(private prisma: PrismaService) {}

  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent user enumeration
    if (!user) return { message: 'Jika email terdaftar, link reset akan dikirim.' };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { user_id: user.id, token, expires_at: expiresAt },
    });

    // Send email via Resend
    const resetUrl = `${process.env.FRONTEND_URL || 'https://dashboardhdago.com'}/reset-password?token=${token}`;
    
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
        return { message: 'Jika email terdaftar, link reset akan dikirim.' };
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'HDA Go <noreply@hdago.apaajadigital.com>',
          to: [email],
          subject: 'Reset Password - HDA Go Dashboard',
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #F6D145, #E8C020); padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #000; font-size: 24px;">🔐 Reset Password</h1>
                <p style="margin: 8px 0 0; color: #333;">HDA Go Dashboard</p>
              </div>
              <div style="padding: 32px;">
                <p>Halo <strong>${user.name}</strong>,</p>
                <p>Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah untuk membuat password baru:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: #F6D145; color: #000; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    Reset Password Sekarang
                  </a>
                </div>
                <p style="color: #888; font-size: 13px;">Link ini akan kedaluwarsa dalam 1 jam.</p>
                <p style="color: #888; font-size: 13px;">Jika kamu tidak meminta reset password, abaikan email ini.</p>
              </div>
              <div style="border-top: 1px solid #333; padding: 20px 32px; text-align: center;">
                <p style="color: #666; font-size: 12px; margin: 0;">© 2026 HDA Go Dashboard</p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Resend API error:', errBody);
      } else {
        const resData = await response.json();
        console.log('[PasswordReset] Email sent, Resend id:', resData?.id, '| to:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));
      }
    } catch (err) {
      console.error('Failed to send reset email:', err);
    }

    return { message: 'Jika email terdaftar, link reset akan dikirim.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expires_at < new Date()) {
      throw new BadRequestException('Token tidak valid atau sudah kedaluwarsa. Silakan minta link reset baru.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.user_id },
        data: { password: hashedPassword, must_change_password: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Password berhasil direset. Silakan login dengan password baru.' };
  }
}
