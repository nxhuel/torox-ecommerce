import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a buffer (from multer memoryStorage) to Cloudinary.
   * Returns the secure URL and public_id so we can delete later if needed.
   */
  async uploadBuffer(
    file: Express.Multer.File,
    folder = 'torox',
  ): Promise<{ url: string; publicId: string }> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        } satisfies UploadApiOptions,
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  /**
   * Delete an image/video from Cloudinary by its public_id.
   */
  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
