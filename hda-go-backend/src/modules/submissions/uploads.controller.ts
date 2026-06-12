import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  @Get(':filename')
  serveFile(@Param('filename') filename: string, @Res() res: express.Response) {
    const baseDir = path.resolve(process.cwd(), 'tmp_uploads');
    const filePath = path.resolve(baseDir, filename);

    // Path traversal guard: resolved path must stay inside tmp_uploads/
    if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
      throw new NotFoundException('File not found');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return res.sendFile(filePath);
  }
}
