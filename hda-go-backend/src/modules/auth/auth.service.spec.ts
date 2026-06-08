import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  creator: { create: jest.fn() },
  creatorProgress: { create: jest.fn() },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  // ── REGISTER ────────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      cm_id: 'cm-1',
    };

    it('registers a new creator and returns tokens, creator profiles, and redirectUrl', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-2',
        name: dto.name,
        email: dto.email,
        role: 'CREATOR',
      });
      mockPrisma.creator.create.mockResolvedValue({});
      mockPrisma.creatorProgress.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.user.role).toBe('CREATOR');
      expect(result.accessToken).toBe('mock-token');
      expect(result.redirectUrl).toBe('/creator/overview');

      expect(mockPrisma.creator.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user_id: 'user-2', cm_id: 'cm-1' }),
        }),
      );
      expect(mockPrisma.creatorProgress.create).toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── LOGIN ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens and redirectUrl for valid credentials', async () => {
      const hashed = await bcrypt.hash('secret', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'ADMIN',
        password: hashed,
      });

      const result = await service.login({
        email: 'admin@test.com',
        password: 'secret',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.redirectUrl).toBe('/admin');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no@one.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'X',
        email: 'x@x.com',
        role: 'CM',
        password: hashed,
      });

      await expect(
        service.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── REFRESH TOKEN ────────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('returns new tokens for valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', role: 'CM' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'X',
        email: 'x@x.com',
        role: 'CM',
        password: 'hashed',
      });

      const result = await service.refreshToken('valid-refresh');
      expect(result.accessToken).toBe('mock-token');
    });

    it('throws UnauthorizedException when token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user not found after verify', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'ghost', role: 'CM' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('orphan-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── CM LIST ──────────────────────────────────────────────────────────────────

  describe('getCMListPublic', () => {
    it('returns list of CMs ordered by name', async () => {
      const cms = [
        { id: 'cm1', name: 'Alice' },
        { id: 'cm2', name: 'Bob' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(cms);

      const result = await service.getCMListPublic();
      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'CM' } }),
      );
    });
  });
});
