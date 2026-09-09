import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UploadsController } from './uploads.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CloudinaryModule,
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
