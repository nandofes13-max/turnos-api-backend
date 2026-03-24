import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor() {
    // Usar CLOUDINARY_URL si está disponible
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_URL.split('@')[1].split('.')[0],
        api_key: process.env.CLOUDINARY_URL.split('://')[1].split(':')[0],
        api_secret: process.env.CLOUDINARY_URL.split(':')[2].split('@')[0],
      });
    }
  }

  async uploadImage(base64Image: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'profesionales',
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary error:', error);
      throw new BadRequestException('Error al subir la imagen');
    }
  }
}
