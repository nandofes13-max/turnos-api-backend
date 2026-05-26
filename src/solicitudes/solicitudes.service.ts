import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class SolicitudesService {
  constructor(private readonly emailService: EmailService) {}

  async enviarSolicitudServicio(createSolicitudDto: CreateSolicitudDto): Promise<void> {
    try {
      await this.emailService.enviarEmailSolicitudServicio(createSolicitudDto);
      console.log(`📧 Solicitud de servicio enviada por email: ${createSolicitudDto.email}`);
    } catch (error) {
      console.error('❌ Error al enviar solicitud:', error);
      throw new BadRequestException('No se pudo enviar la solicitud. Intentá de nuevo más tarde.');
    }
  }
}
