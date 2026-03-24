import { Controller, Post, Body } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  async upload(@Body() uploadImageDto: UploadImageDto) {
    const url = await this.uploadService.uploadImage(uploadImageDto.image);
    return { url };
  }
}
