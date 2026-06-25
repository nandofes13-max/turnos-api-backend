// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller'; // 👈 NUEVO import
import { EmailService } from './email.service';

@Module({
  providers: [NotificationsService, EmailService],
  controllers: [NotificationsController], // 👈 NUEVO: agregar controller
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
