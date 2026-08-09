// src/whatsapp/whatsapp.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappConfigDto } from './dto/create-whatsapp-config.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * GET /whatsapp/:negocioId/config
   * Obtiene la configuración de WhatsApp de un negocio
   */
  @Get(':negocioId/config')
  async obtenerConfiguracion(@Param('negocioId') negocioId: string) {
    const id = Number(negocioId);
    const config = await this.whatsappService.obtenerConfiguracion(id);
    if (!config) {
      throw new NotFoundException(
        `El negocio ID ${id} no tiene configuración de WhatsApp`,
      );
    }
    return config;
  }

  /**
   * POST /whatsapp/:negocioId/config
   * Guarda o actualiza la configuración de WhatsApp de un negocio
   */
  @Post(':negocioId/config')
  async guardarConfiguracion(
    @Param('negocioId') negocioId: string,
    @Body() createDto: CreateWhatsappConfigDto,
  ) {
    const id = Number(negocioId);
    const config = await this.whatsappService.guardarConfiguracion(
      id,
      createDto.instanceId,
      createDto.apiToken,
      createDto.phoneNumber,
      createDto.provider || 'greenapi',
    );
    return {
      success: true,
      message: 'Configuración de WhatsApp guardada correctamente',
      config,
    };
  }

  /**
   * POST /whatsapp/:negocioId/test
   * Envía un mensaje de prueba al número configurado
   */
  @Post(':negocioId/test')
  async enviarMensajePrueba(@Param('negocioId') negocioId: string) {
    const id = Number(negocioId);
    try {
      await this.whatsappService.enviarMensajePrueba(id);
      return {
        success: true,
        message: '✅ Mensaje de prueba enviado correctamente',
      };
    } catch (error) {
      throw new BadRequestException(
        `Error al enviar mensaje de prueba: ${error.message}`,
      );
    }
  }

  /**
   * POST /whatsapp/:negocioId/validate
   * Valida la conexión con el proveedor configurado
   */
  @Post(':negocioId/validate')
  async validarConexion(@Param('negocioId') negocioId: string) {
    const id = Number(negocioId);
    const esValido = await this.whatsappService.validarConexion(id);
    if (esValido) {
      return {
        success: true,
        message: '✅ Conexión validada correctamente',
        estado: 'authorized',
      };
    } else {
      return {
        success: false,
        message: '❌ No se pudo validar la conexión. Verificá tus credenciales.',
        estado: 'error',
      };
    }
  }

  /**
   * DELETE /whatsapp/:negocioId/config
   * Desactiva la configuración de WhatsApp de un negocio
   */
  @Delete(':negocioId/config')
  async desactivarConfiguracion(@Param('negocioId') negocioId: string) {
    const id = Number(negocioId);
    await this.whatsappService.desactivarConfiguracion(id);
    return {
      success: true,
      message: 'Configuración de WhatsApp desactivada correctamente',
    };
  }
}
