import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
};

describe('SettingsController', () => {
  let controller: SettingsController;
  const mockReq = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockService }],
    }).compile();
    controller = module.get<SettingsController>(SettingsController);
  });

  it('getProfile delegates userId', async () => {
    mockService.getProfile.mockResolvedValue({ name: 'User' });
    await controller.getProfile(mockReq);
    expect(mockService.getProfile).toHaveBeenCalledWith('user-1');
  });

  it('updateProfile delegates userId and data', async () => {
    mockService.updateProfile.mockResolvedValue({ success: true });
    await controller.updateProfile(mockReq, { name: 'New' });
    expect(mockService.updateProfile).toHaveBeenCalledWith('user-1', {
      name: 'New',
    });
  });

  it('updatePassword delegates userId and data', async () => {
    mockService.updatePassword.mockResolvedValue({ success: true });
    await controller.updatePassword(mockReq, {
      oldPassword: 'a',
      newPassword: 'b',
    });
    expect(mockService.updatePassword).toHaveBeenCalledWith('user-1', {
      oldPassword: 'a',
      newPassword: 'b',
    });
  });

  it('updateNotifications returns ok stub', () => {
    const result = controller.updateNotifications(mockReq, { email: true });
    expect(result).toEqual({ message: 'ok', data: { email: true } });
  });
});
