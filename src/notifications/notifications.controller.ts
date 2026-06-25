// src/notifications/notifications.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ✅ NUEVO: Endpoint para enviar email de bienvenida al dueño del negocio
  @Post('bienvenida-negocio')
  async enviarBienvenidaNegocio(@Body() body: {
    email: string;
    nombreNegocio: string;
    urlPublica: string;
    urlGestion: string;
  }) {
    await this.notificationsService.enviarBienvenidaNegocio(body);
    return { message: 'Email de bienvenida enviado correctamente' };
  }
}
