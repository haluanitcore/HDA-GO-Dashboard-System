import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  create: jest.fn(),
  publish: jest.fn(),
  joinCampaign: jest.fn(),
  findForCreator: jest.fn(),
  getCategories: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('CampaignsController', () => {
  let controller: CampaignsController;
  const mockReq = { user: { userId: 'user-1', role: 'CM' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [{ provide: CampaignsService, useValue: mockService }],
    }).compile();
    controller = module.get<CampaignsController>(CampaignsController);
  });

  it('create delegates DTO', async () => {
    const dto = { title: 'Campaign' } as any;
    mockService.create.mockResolvedValue({ id: 'c1' });
    await controller.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('publish delegates by ID', async () => {
    mockService.publish.mockResolvedValue({ success: true });
    await controller.publish('c1');
    expect(mockService.publish).toHaveBeenCalledWith('c1');
  });

  it('join delegates userId and DTO', async () => {
    const dto = { campaign_id: 'c1' } as any;
    mockService.joinCampaign.mockResolvedValue({ success: true });
    await controller.join(mockReq, dto);
    expect(mockService.joinCampaign).toHaveBeenCalledWith('user-1', dto);
  });

  it('getCampaignHub delegates userId and category', async () => {
    mockService.findForCreator.mockResolvedValue([]);
    await controller.getCampaignHub(mockReq, 'HOTEL');
    expect(mockService.findForCreator).toHaveBeenCalledWith('user-1', 'HOTEL');
  });

  it('getCategories returns list', () => {
    mockService.getCategories.mockReturnValue(['HOTEL', 'FNB']);
    const result = controller.getCategories();
    expect(result).toEqual(['HOTEL', 'FNB']);
  });

  it('findAll delegates filters and user', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll(mockReq, 'ACTIVE', 'HOTEL');
    expect(mockService.findAll).toHaveBeenCalledWith(
      { status: 'ACTIVE', category: 'HOTEL' },
      mockReq.user,
    );
  });

  it('findOne delegates by ID', async () => {
    mockService.findOne.mockResolvedValue({ id: 'c1' });
    const result = await controller.findOne('c1');
    expect(result).toEqual({ id: 'c1' });
  });
});
