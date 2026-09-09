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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
];

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
  constructor(private readonly cloudinary: CloudinaryService) {}

  /** Accepts one or many media files (images or videos) under the "images" field. */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 12 }], {
      storage: memoryStorage(),
      fileFilter,
      limits: { fileSize: MAX_VIDEO_SIZE, files: 12 },
    }),
  )
  async upload(@UploadedFiles() files: { images?: Express.Multer.File[] }) {
    const images = files?.images || [];
    if (!images.length) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const results = await Promise.all(
      images.map((file) => this.cloudinary.uploadBuffer(file, 'torox/products')),
    );

    return { urls: results.map((r) => r.url) };
  }

  @Delete(':filename')
  async remove(@Param('filename') filename: string) {
    // Extract the public_id from a Cloudinary URL or use the filename directly.
    const publicId = filename.includes('/')
      ? filename.replace(/\.[^.]+$/, '') // strip extension if full path
      : `torox/products/${filename.replace(/\.[^.]+$/, '')}`;

    await this.cloudinary.deleteFile(publicId);
    return { deleted: true };
  }
}
