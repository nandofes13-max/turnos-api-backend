import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor() {
    // Configurar Cloudinary usando la variable de entorno
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    
    if (!cloudinaryUrl) {
      console.error('❌ CLOUDINARY_URL no está configurada');
      throw new Error('Missing Cloudinary configuration');
    }

    // Parsear la URL de Cloudinary
    // Formato: cloudinary://api_key:api_secret@cloud_name
    const match = cloudinaryUrl.match(/cloudinary:\/\/(.+):(.+)@(.+)/);
    if (!match) {
      console.error('❌ Formato de CLOUDINARY_URL inválido');
      throw new Error('Invalid Cloudinary URL format');
    }

    const apiKey = match[1];
    const apiSecret = match[2];
    const cloudName = match[3];

    console.log('✅ Configurando Cloudinary con:', { cloudName, apiKey: '***' });

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
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
