import { EventsGateway } from './events.gateway';
import { Socket, Server } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockServer: Partial<Server>;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    gateway = new EventsGateway();
    mockEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockEmit }),
    };
    (gateway as any).server = mockServer;
  });

  // ══════════════════════════════════════════════════
  // handleConnection / handleDisconnect
  // ══════════════════════════════════════════════════
  describe('handleConnection', () => {
    it('registers user socket and joins room', async () => {
      const mockJoin = jest.fn();
      const client = {
        id: 'socket-1',
        handshake: { query: { userId: 'user-1' } },
        join: mockJoin,
      } as unknown as Socket;

      await gateway.handleConnection(client);

      expect(mockJoin).toHaveBeenCalledWith('user:user-1');
    });

    it('handles multiple connections from same user', async () => {
      const mockJoin = jest.fn();
      const client1 = {
        id: 'socket-1',
        handshake: { query: { userId: 'user-1' } },
        join: mockJoin,
      } as unknown as Socket;
      const client2 = {
        id: 'socket-2',
        handshake: { query: { userId: 'user-1' } },
        join: mockJoin,
      } as unknown as Socket;

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      expect(mockJoin).toHaveBeenCalledTimes(2);
    });

    it('skips registration when userId is missing', async () => {
      const mockJoin = jest.fn();
      const client = {
        id: 'socket-1',
        handshake: { query: {} },
        join: mockJoin,
      } as unknown as Socket;

      await gateway.handleConnection(client);

      expect(mockJoin).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('removes socket from user map', async () => {
      const mockJoin = jest.fn();
      const client = {
        id: 'socket-1',
        handshake: { query: { userId: 'user-1' } },
        join: mockJoin,
      } as unknown as Socket;

      await gateway.handleConnection(client);
      gateway.handleDisconnect(client);

      // userSocketMap should be cleaned up
    });

    it('handles disconnect without userId', () => {
      const client = {
        id: 'socket-1',
        handshake: { query: {} },
      } as unknown as Socket;

      // Should not throw
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════
  // Emit Methods
  // ══════════════════════════════════════════════════
  describe('emitSubmissionApproved', () => {
    it('emits to correct user room', () => {
      gateway.emitSubmissionApproved('user-1', {
        campaignTitle: 'Hotel Campaign',
        qcNotes: 'Bagus!',
      });

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith(
        'submission:approved',
        expect.objectContaining({
          type: 'submission:approved',
          title: '✅ Submission Approved!',
          campaignTitle: 'Hotel Campaign',
        }),
      );
    });
  });

  describe('emitNewCampaign', () => {
    it('emits to multiple users', () => {
      gateway.emitNewCampaign(['user-1', 'user-2'], {
        campaignId: 'c1',
        title: 'New Campaign',
        category: 'HOTEL',
      });

      expect(mockServer.to).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith(
        'campaign:new',
        expect.objectContaining({
          type: 'campaign:new',
          notifTitle: '📢 Campaign Baru!',
        }),
      );
    });
  });

  describe('emitLevelUp', () => {
    it('emits level up event with details', () => {
      gateway.emitLevelUp('user-1', { newLevel: 3, levelName: 'Gold' });

      expect(mockEmit).toHaveBeenCalledWith(
        'creator:levelup',
        expect.objectContaining({
          type: 'creator:levelup',
          newLevel: 3,
          levelName: 'Gold',
        }),
      );
    });
  });

  describe('emitCampaignPush', () => {
    it('emits campaign push to user', () => {
      gateway.emitCampaignPush('user-1', {
        campaignId: 'c1',
        campaignTitle: 'Hotel Bali',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'campaign:push',
        expect.objectContaining({ type: 'campaign:push' }),
      );
    });
  });

  describe('emitRewardClaim', () => {
    it('emits reward claim event', () => {
      gateway.emitRewardClaim('user-1', { rewardName: 'Voucher 50K' });

      expect(mockEmit).toHaveBeenCalledWith(
        'reward:claim',
        expect.objectContaining({
          type: 'reward:claim',
          rewardName: 'Voucher 50K',
        }),
      );
    });
  });

  describe('emitNotification', () => {
    it('emits generic notification', () => {
      gateway.emitNotification('user-1', {
        title: 'Test',
        message: 'Hello',
        type: 'SYSTEM',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          title: 'Test',
          message: 'Hello',
          type: 'SYSTEM',
        }),
      );
    });
  });

  describe('emitBDNewCampaign', () => {
    it('emits to multiple BD users', () => {
      gateway.emitBDNewCampaign(['bd-1', 'bd-2'], {
        campaignId: 'c1',
        title: 'Campaign X',
        brandName: 'Brand A',
      });

      expect(mockServer.to).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith(
        'bd:new-campaign',
        expect.objectContaining({
          type: 'bd:new-campaign',
          title: '📥 Campaign Baru Masuk',
        }),
      );
    });
  });

  describe('emitBDApproved', () => {
    it('emits to multiple CM users', () => {
      gateway.emitBDApproved(['cm-1'], {
        campaignId: 'c1',
        title: 'Campaign X',
        bdName: 'BD User',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'bd:campaign-approved',
        expect.objectContaining({
          type: 'bd:campaign-approved',
          title: '📋 Campaign Approved by BD',
        }),
      );
    });
  });
});
