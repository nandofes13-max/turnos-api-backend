// src/whatsapp/whatsapp.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappProvider, NuevoTurnoWhatsappPayload } from './interfaces/whatsapp-provider.interface';
import { GreenApiProvider } from './providers/green-api.provider';
import { WhatsappConfig } from './entities/whatsapp-config.entity';
import { Negocio } from '../negocios/entities/negocio.entity';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly greenApiProvider: GreenApiProvider,
    @InjectRepository(WhatsappConfig)
    private readonly configRepository: Repository<WhatsappConfig>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
  ) {}

  /**
   * Obtiene el proveedor de WhatsApp configurado para un negocio
   * @throws NotFoundException si el negocio no tiene configuración
   * @throws BadRequestException si el proveedor no está soportado
   */
  private async obtenerProveedor(negocioId: number): Promise<WhatsappProvider> {
    const config = await this.configRepository.findOne({
      where: { negocioId, activo: true },
    });

    if (!config) {
      throw new NotFoundException(
        `El negocio ID ${negocioId} no tiene configuración de WhatsApp activa.`
      );
    }

    // Determinar proveedor según la configuración
    switch (config.provider) {
      case 'greenapi':
        return this.greenApiProvider;
      
      // FUTURO: caso para Meta Cloud API
      // case 'meta':
      //   return this.metaCloudProvider;

      default:
        throw new BadRequestException(
          `Proveedor de WhatsApp no soportado: ${config.provider}`
        );
    }
  }

  /**
   * Envía una notificación de nuevo turno usando el proveedor configurado para el negocio
   */
  async enviarNuevoTurno(
    negocioId: number,
    payload: NuevoTurnoWhatsappPayload,
  ): Promise<void> {
    try {
      const provider = await this.obtenerProveedor(negocioId);
      await provider.enviarNuevoTurno(negocioId, payload);
    } catch (error) {
      // 👈 LOG pero NO lanzamos error para no romper el flujo de creación de turnos
      console.error(`❌ Error enviando notificación WhatsApp al negocio ${negocioId}:`, error.message);
      // No re-lanzamos el error para que el turno se guarde igual
    }
  }

  /**
   * Envía un mensaje de prueba usando el proveedor configurado para el negocio
   * @throws Error si el proveedor falla
   */
  async enviarMensajePrueba(negocioId: number): Promise<void> {
    const provider = await this.obtenerProveedor(negocioId);
    await provider.enviarMensajePrueba(negocioId);
  }

  /**
   * Valida la conexión con el proveedor configurado para el negocio
   */
  async validarConexion(negocioId: number): Promise<boolean> {
    try {
      const provider = await this.obtenerProveedor(negocioId);
      return await provider.validarConexion(negocioId);
    } catch (error) {
      console.error(`❌ Error validando conexión WhatsApp del negocio ${negocioId}:`, error.message);
      return false;
    }
  }

  /**
   * Obtiene la configuración de WhatsApp de un negocio
   */
  async obtenerConfiguracion(negocioId: number): Promise<WhatsappConfig | null> {
    return this.configRepository.findOne({
      where: { negocioId },
    });
  }

  /**
   * Guarda o actualiza la configuración de WhatsApp de un negocio
   */
  async guardarConfiguracion(
    negocioId: number,
    instanceId: string,
    apiToken: string,
    phoneNumber?: string,
    provider: string = 'greenapi',
  ): Promise<WhatsappConfig> {
    // Verificar que el negocio existe
    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${negocioId} no encontrado`);
    }

    // Guardar configuración usando GREEN API provider (por ahora)
    // En el futuro, cuando haya más providers, se podría delegar en un factory
    const config = await this.greenApiProvider.guardarConfiguracion(
      negocioId,
      instanceId,
      apiToken,
      phoneNumber,
      provider,
    );

    // Después de guardar, validar la conexión automáticamente
    const esValido = await this.validarConexion(negocioId);
    if (esValido) {
      // Enviar mensaje de prueba automático
      try {
        await this.enviarMensajePrueba(negocioId);
      } catch (error) {
        console.error('⚠️ No se pudo enviar mensaje de prueba:', error.message);
        // No fallamos la configuración si el mensaje de prueba falla
      }
    }

    return config;
  }

  /**
   * Desactiva la configuración de WhatsApp de un negocio
   */
  async desactivarConfiguracion(negocioId: number): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { negocioId },
    });

    if (config) {
      config.activo = false;
      config.estado = 'disabled';
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
      await this.configRepository.save(config);
    }
  }
}
