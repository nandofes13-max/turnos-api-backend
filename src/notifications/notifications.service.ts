import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';
import { Turno } from '../turnos/entities/turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Centro } from '../centro/entities/centro.entity';

@Injectable()
export class NotificationsService {
  constructor(private readonly emailService: EmailService) {}

  async enviarEmailConfirmacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
    return this.emailService.enviarEmailConfirmacion(turno, usuario, centro);
  }

  async enviarEmailCancelacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
    return this.emailService.enviarEmailCancelacion(turno, usuario, centro);
  }
}
