import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

const mockConfig = { get: jest.fn().mockReturnValue('test-secret') };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('returns userId and role from payload', () => {
      const result = strategy.validate({ sub: 'u1', role: 'CM' });
      expect(result).toEqual({ userId: 'u1', role: 'CM' });
    });

    it('returns CREATOR role correctly', () => {
      const result = strategy.validate({
        sub: 'creator-1',
        role: 'CREATOR',
      });
      expect(result.role).toBe('CREATOR');
      expect(result.userId).toBe('creator-1');
    });
  });
});
