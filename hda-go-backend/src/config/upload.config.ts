import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// Allowed MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALL_ALLOWED_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES];

// Max file sizes
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

// Temp upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'tmp_uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const multerConfig = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${randomUUID()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Set to max (200MB), we validate per-type in fileFilter
    files: 1, // Only 1 file per submission
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `Format file tidak didukung: ${file.mimetype}. Hanya video (.mp4, .mov, .avi, .webm) dan foto (.jpg, .png, .webp) yang diizinkan.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};

/**
 * Validate file size based on type (called after upload)
 */
export function validateFileSize(file: Express.Multer.File): void {
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const maxLabel = isVideo ? '200MB' : '50MB';

  if (file.size > maxSize) {
    // Delete the uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new BadRequestException(
      `Ukuran file (${(file.size / 1024 / 1024).toFixed(1)}MB) melebihi batas maksimal ${maxLabel} untuk ${isVideo ? 'video' : 'foto'}.`,
    );
  }
}

export { UPLOAD_DIR, ALLOWED_VIDEO_TYPES, ALLOWED_IMAGE_TYPES };
