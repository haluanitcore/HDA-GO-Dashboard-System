import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MustChangePasswordGuard } from './password-change.guard';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

function makeContext(
  method: string,
  path: string,
  token?: string,
): ExecutionContext {
  const req: Record<string, unknown> = { method, path, cookies: {}, headers: {} };
  if (token) {
    (req.headers as Record<string, string>).authorization = `Bearer ${token}`;
  }
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return `${header}.${payload}.fakesig`;
}

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new MustChangePasswordGuard(mockPrisma as any);
  });

  it('blocks protected endpoint with 403 when must_change_password is true', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ must_change_password: true });

    const ctx = makeContext('GET', '/api/creators', makeToken('u1'));

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'PASSWORD_CHANGE_REQUIRED' }),
    });
  });

  it('allows PATCH /api/settings/password even when must_change_password is true', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ must_change_password: true });

    const ctx = makeContext('PATCH', '/api/settings/password', makeToken('u1'));

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});
