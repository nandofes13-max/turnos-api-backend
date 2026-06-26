// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
// 👈 Importar las entidades necesarias para los repositorios
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    // 👈 Agregar TypeOrmModule con las entidades que EmailService necesita
    TypeOrmModule.forFeature([NegocioUsuarioRol, Usuario]),
  ],
  providers: [NotificationsService, EmailService],
  controllers: [NotificationsController],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
