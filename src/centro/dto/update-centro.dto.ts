import { PartialType } from '@nestjs/mapped-types';
import { CreateCentroDto } from './create-centro.dto';

export class UpdateCentroDto extends PartialType(CreateCentroDto) {}
