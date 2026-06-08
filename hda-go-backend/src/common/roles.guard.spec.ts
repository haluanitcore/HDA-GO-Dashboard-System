import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

const mockReflector = { getAllAndOverride: jest.fn() };

function buildContext(role: string | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();
    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('allows access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    expect(guard.canActivate(buildContext('CM'))).toBe(true);
  });

  it('allows access when user role matches required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['CM', 'ADMIN']);
    expect(guard.canActivate(buildContext('CM'))).toBe(true);
  });

  it('denies access when user role does not match', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(buildContext('CREATOR'))).toBe(false);
  });

  it('denies access when user is undefined', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
