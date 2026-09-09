import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/ogg': '.ogv',
};

function fileFilter(_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new BadRequestException(`Formato no permitido: ${file.mimetype}. Usá JPG, PNG, WebP, GIF, MP4 o WebM.`), false);
  }
  const max = file.mimetype.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > max) {
    return cb(new BadRequestException(`El archivo ${file.originalname} supera el máximo de ${Math.round(max / 1024 / 1024)}MB.`), false);
  }
  cb(null, true);
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UploadsController {
  /** Accepts one or many media files (images or videos) under the "images" field. */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 12 }], {
      storage: memoryStorage(),
      fileFilter,
      limits: { fileSize: MAX_VIDEO_SIZE, files: 12 },
    }),
  )
  upload(@UploadedFiles() files: { images?: Express.Multer.File[] }) {
    const images = files?.images || [];
    if (!images.length) {
      throw new BadRequestException('No se recibieron archivos');
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const urls = images.map((file) => {
      const ext = EXT_BY_MIME[file.mimetype] || extname(file.originalname) || '.jpg';
      const filename = `${Date.now()}-${randomUUID()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
      return `/uploads/${filename}`;
    });

    return { urls };
  }

  @Delete(':filename')
  remove(@Param('filename') filename: string) {
    // Only allow plain filenames, no paths.
    const safe = path.basename(filename);
    const target = path.join(UPLOADS_DIR, safe);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return { deleted: true };
  }
}
