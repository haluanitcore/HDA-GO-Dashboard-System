import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs';

@Injectable()
export class GDriveService {
  private readonly logger = new Logger(GDriveService.name);
  private drive: drive_v3.Drive | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    try {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!keyJson) {
        this.logger.warn(
          'GOOGLE_SERVICE_ACCOUNT_KEY not set — GDrive upload disabled',
        );
        return;
      }

      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('✅ Google Drive API initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Google Drive API', error);
      this.drive = null;
    }
  }

  /**
   * Check if Google Drive API is available
   */
  isAvailable(): boolean {
    return this.drive !== null;
  }

  /**
   * Upload file to a specific Google Drive folder
   * @param localFilePath - Absolute path to file on VPS
   * @param fileName - Desired filename in Google Drive
   * @param mimeType - MIME type of the file
   * @param folderId - Google Drive folder ID of the CM
   * @returns { fileId, webViewLink } or null if failed
   */
  async uploadFile(
    localFilePath: string,
    fileName: string,
    mimeType: string,
    folderId: string,
  ): Promise<{ fileId: string; webViewLink: string } | null> {
    if (!this.drive) {
      this.logger.warn('GDrive not initialized — skipping upload');
      return null;
    }

    try {
      this.logger.log(
        `📤 Uploading "${fileName}" to GDrive folder: ${folderId}`,
      );

      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType,
        body: fs.createReadStream(localFilePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink',
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;

      if (!fileId) {
        this.logger.error('GDrive upload returned no fileId');
        return null;
      }

      // Make file viewable by anyone with the link
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      this.logger.log(`✅ File uploaded to GDrive: ${fileId}`);

      return {
        fileId,
        webViewLink:
          webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      };
    } catch (error) {
      this.logger.error(`❌ GDrive upload failed for "${fileName}"`, error);
      return null;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<boolean> {
    if (!this.drive) return false;

    try {
      await this.drive.files.delete({ fileId });
      this.logger.log(`🗑️ File deleted from GDrive: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete GDrive file: ${fileId}`, error);
      return false;
    }
  }

  /**
   * Extract folder ID from a Google Drive folder URL
   * Example: https://drive.google.com/drive/folders/1ABC123 → 1ABC123
   */
  static extractFolderId(driveUrl: string): string | null {
    if (!driveUrl) return null;

    // Direct folder ID (no URL)
    if (!driveUrl.includes('/')) return driveUrl;

    // URL format: https://drive.google.com/drive/folders/{FOLDER_ID}
    const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
}
