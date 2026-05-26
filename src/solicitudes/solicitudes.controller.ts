import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post('servicio')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async solicitarServicio(@Body() createSolicitudDto: CreateSolicitudDto): Promise<{ success: boolean; message: string }> {
    await this.solicitudesService.enviarSolicitudServicio(createSolicitudDto);
    return {
      success: true,
      message: 'Solicitud enviada con éxito. Te contactaremos a la brevedad.',
    };
  }
}
