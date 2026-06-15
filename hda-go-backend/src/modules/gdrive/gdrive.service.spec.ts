import { Test, TestingModule } from '@nestjs/testing';
import { GDriveService } from './gdrive.service';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    drive: jest.fn().mockReturnValue({
      files: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      permissions: {
        create: jest.fn(),
      },
    }),
  },
}));

// Mock fs
jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue('mock-stream'),
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('GDriveService', () => {
  let service: GDriveService;

  // ══════════════════════════════════════════════════
  // extractFolderId (static, no DI needed)
  // ══════════════════════════════════════════════════
  describe('extractFolderId', () => {
    it('extracts folder ID from standard Google Drive URL', () => {
      const result = GDriveService.extractFolderId(
        'https://drive.google.com/drive/folders/1ABC123xyz',
      );
      expect(result).toBe('1ABC123xyz');
    });

    it('returns direct folder ID when no URL', () => {
      expect(GDriveService.extractFolderId('1ABC123xyz')).toBe('1ABC123xyz');
    });

    it('returns null for empty string', () => {
      expect(GDriveService.extractFolderId('')).toBeNull();
    });

    it('returns null for invalid URL without folders path', () => {
      expect(
        GDriveService.extractFolderId('https://drive.google.com/file/d/xxx'),
      ).toBeNull();
    });

    it('handles URL with query params', () => {
      const result = GDriveService.extractFolderId(
        'https://drive.google.com/drive/folders/1ABC123?usp=sharing',
      );
      expect(result).toBe('1ABC123');
    });
  });

  // ══════════════════════════════════════════════════
  // Service with mocked Google API
  // ══════════════════════════════════════════════════
  describe('with Google API', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
        private_key: 'test-key',
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [GDriveService],
      }).compile();
      service = module.get<GDriveService>(GDriveService);
    });

    afterEach(() => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    });

    describe('isAvailable', () => {
      it('returns true when drive is initialized', () => {
        expect(service.isAvailable()).toBe(true);
      });
    });

    describe('uploadFile', () => {
      it('uploads file and sets permissions', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.create.mockResolvedValue({
          data: {
            id: 'file-123',
            webViewLink: 'https://drive.google.com/view',
          },
        });
        mockDrive.permissions.create.mockResolvedValue({});

        const result = await service.uploadFile(
          '/tmp/video.mp4',
          'video.mp4',
          'video/mp4',
          'folder-123',
        );

        expect(result).toEqual({
          fileId: 'file-123',
          webViewLink: 'https://drive.google.com/view',
        });
        expect(mockDrive.permissions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            fileId: 'file-123',
            requestBody: { role: 'reader', type: 'anyone' },
          }),
        );
      });

      it('returns fallback webViewLink when API returns null', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.create.mockResolvedValue({
          data: { id: 'file-456', webViewLink: null },
        });
        mockDrive.permissions.create.mockResolvedValue({});

        const result = await service.uploadFile(
          '/tmp/f.mp4',
          'f.mp4',
          'video/mp4',
          'folder',
        );

        expect(result.webViewLink).toBe(
          'https://drive.google.com/file/d/file-456/view',
        );
      });

      it('returns null when upload returns no fileId', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.create.mockResolvedValue({ data: { id: null } });

        const result = await service.uploadFile(
          '/tmp/f.mp4',
          'f.mp4',
          'video/mp4',
          'folder',
        );

        expect(result).toBeNull();
      });

      it('returns null on API error', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.create.mockRejectedValue(new Error('API error'));

        const result = await service.uploadFile(
          '/tmp/f.mp4',
          'f.mp4',
          'video/mp4',
          'folder',
        );

        expect(result).toBeNull();
      });
    });

    describe('deleteFile', () => {
      it('deletes file and returns true', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.delete.mockResolvedValue({});

        const result = await service.deleteFile('file-123');

        expect(result).toBe(true);
      });

      it('returns false on error', async () => {
        const { google } = require('googleapis');
        const mockDrive = google.drive();
        mockDrive.files.delete.mockRejectedValue(new Error('Not found'));

        const result = await service.deleteFile('file-999');

        expect(result).toBe(false);
      });
    });
  });

  // ══════════════════════════════════════════════════
  // Without Google API key
  // ══════════════════════════════════════════════════
  describe('without GOOGLE_SERVICE_ACCOUNT_KEY', () => {
    beforeEach(async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

      const module: TestingModule = await Test.createTestingModule({
        providers: [GDriveService],
      }).compile();
      service = module.get<GDriveService>(GDriveService);
    });

    it('isAvailable returns false', () => {
      expect(service.isAvailable()).toBe(false);
    });

    it('uploadFile returns null', async () => {
      const result = await service.uploadFile(
        '/tmp/f.mp4',
        'f.mp4',
        'video/mp4',
        'folder',
      );
      expect(result).toBeNull();
    });

    it('deleteFile returns false', async () => {
      const result = await service.deleteFile('file-123');
      expect(result).toBe(false);
    });
  });
});
