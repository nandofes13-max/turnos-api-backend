// src/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappConfig } from './entities/whatsapp-config.entity';
import { InstanciaWhatsapp } from './entities/instancia-whatsapp.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { GreenApiProvider } from './providers/green-api.provider';
// 👈 IMPORTAR EL NUEVO SERVICIO Y CONTROLADOR
import { InstanciasWhatsappService } from './instancias-whatsapp.service';
import { InstanciasWhatsappController } from './instancias-whatsapp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappConfig,
      InstanciaWhatsapp, // 👈 AGREGAR
      Negocio,
    ]),
  ],
  controllers: [
    WhatsappController,
    InstanciasWhatsappController, // 👈 AGREGAR
  ],
  providers: [
    WhatsappService,
    GreenApiProvider,
    InstanciasWhatsappService, // 👈 AGREGAR
  ],
  exports: [
    WhatsappService,
    InstanciasWhatsappService, // 👈 AGREGAR (para usar en otros módulos)
  ],
})
export class WhatsappModule {}
