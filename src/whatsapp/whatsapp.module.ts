// src/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappConfig } from './entities/whatsapp-config.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { GreenApiProvider } from './providers/green-api.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappConfig,
      Negocio, // 👈 Necesario para inyectar el repositorio en el servicio
    ]),
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    GreenApiProvider,
    // 👈 Futuro: MetaCloudProvider (cuando se implemente)
  ],
  exports: [
    WhatsappService, // 👈 Exportamos para que otros módulos puedan usarlo
  ],
})
export class WhatsappModule {}
