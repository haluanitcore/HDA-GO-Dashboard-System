import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SettingsService>(SettingsService);
  });

  // ── getProfile ───────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns user profile when found', async () => {
      const user = { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'CM' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('u1');
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateProfile ────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates only the provided fields', async () => {
      const updated = {
        id: 'u1',
        name: 'Bob',
        email: 'b@test.com',
        role: 'CM',
        avatar_url: null,
        bio: 'Hello',
        phone: null,
        gdrive_url: null,
      };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('u1', {
        name: 'Bob',
        bio: 'Hello',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Bob', bio: 'Hello' }),
        }),
      );
      expect(result.name).toBe('Bob');
    });

    it('sets null for empty string fields like bio and phone', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateProfile('u1', { bio: '', phone: '' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bio: null, phone: null }),
        }),
      );
    });
  });

  // ── updatePassword ───────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('updates password when old password matches and new is different', async () => {
      const hashed = await bcrypt.hash('oldpass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: hashed,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updatePassword('u1', {
        oldPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(result.message).toBe('Password updated successfully');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('resets must_change_password to false after successful password update', async () => {
      const hashed = await bcrypt.hash('oldpass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: hashed,
        must_change_password: true,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.updatePassword('u1', {
        oldPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ must_change_password: false }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('ghost', { oldPassword: 'a', newPassword: 'b' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when old or new password missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', password: 'x' });

      await expect(
        service.updatePassword('u1', { oldPassword: '', newPassword: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when old password is incorrect', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: hashed,
      });

      await expect(
        service.updatePassword('u1', {
          oldPassword: 'wrong',
          newPassword: 'new123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new password equals old password', async () => {
      const hashed = await bcrypt.hash('samepass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: hashed,
      });

      await expect(
        service.updatePassword('u1', {
          oldPassword: 'samepass',
          newPassword: 'samepass',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
