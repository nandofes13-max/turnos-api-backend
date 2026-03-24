import { IsNotEmpty, IsString } from 'class-validator';

export class UploadImageDto {
  @IsString()
  @IsNotEmpty({ message: 'La imagen es obligatoria' })
  image: string;
}
