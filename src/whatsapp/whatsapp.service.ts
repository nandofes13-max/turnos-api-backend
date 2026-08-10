// src/whatsapp/whatsapp.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappProvider, NuevoTurnoWhatsappPayload } from './interfaces/whatsapp-provider.interface';
import { GreenApiProvider } from './providers/green-api.provider';
import { WhatsappConfig } from './entities/whatsapp-config.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { InstanciasWhatsappService } from './instancias-whatsapp.service';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly greenApiProvider: GreenApiProvider,
    @InjectRepository(WhatsappConfig)
    private readonly configRepository: Repository<WhatsappConfig>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    private readonly instanciasService: InstanciasWhatsappService,
  ) {}

  /**
   * Obtiene el número de WhatsApp de un negocio
   * - Primero busca en negocio_whatsapp_config (si está activo)
   * - Si no, busca en la tabla negocio
   * @returns string | null
   */
  async obtenerNumeroWhatsAppNegocio(negocioId: number): Promise<string | null> {
    // 1. Buscar en la configuración de WhatsApp
    const config = await this.configRepository.findOne({
      where: { negocioId, activo: true },
    });

    if (config && config.phoneNumber) {
      return config.phoneNumber;
    }

    // 2. Si no hay configuración activa, buscar en la tabla negocio
    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });

    if (negocio && negocio.whatsapp_e164) {
      return negocio.whatsapp_e164;
    }

    return null;
  }

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
      console.error(`❌ Error enviando notificación WhatsApp al negocio ${negocioId}:`, error.message);
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
   * 👈 AHORA ASIGNA UNA INSTANCIA AUTOMÁTICAMENTE
   */
  async guardarConfiguracion(
    negocioId: number,
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

    // 👈 BUSCAR UNA INSTANCIA DISPONIBLE
    const instancia = await this.instanciasService.findDisponible();
    if (!instancia) {
      throw new BadRequestException(
        'No hay instancias de WhatsApp disponibles. Contactá al administrador.'
      );
    }

    // Buscar configuración existente
    let config = await this.configRepository.findOne({
      where: { negocioId },
    });

    // Si el número no fue proporcionado, obtenerlo del negocio
    let phoneNumberFinal = phoneNumber;
    if (!phoneNumberFinal) {
      phoneNumberFinal = negocio.whatsapp_e164 || null;
    }

    if (config) {
      // Actualizar existente
      config.phoneNumber = phoneNumberFinal;
      config.provider = provider;
      config.activo = true;
      config.estado = 'pending';
      config.instanciaId = instancia.id; // 👈 ASIGNAR INSTANCIA
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
    } else {
      // Crear nueva
      config = this.configRepository.create({
        negocioId,
        phoneNumber: phoneNumberFinal,
        provider,
        activo: true,
        estado: 'pending',
        instanciaId: instancia.id, // 👈 ASIGNAR INSTANCIA
        usuario_alta: 'system',
        fecha_alta: new Date(),
      });
    }

    await this.configRepository.save(config);

    // 👈 ACTUALIZAR CONTADOR DE LA INSTANCIA
    await this.instanciasService.actualizarContador(instancia.id);

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
      const instanciaId = config.instanciaId;
      config.activo = false;
      config.estado = 'disabled';
      config.fecha_baja = new Date();
      config.usuario_baja = 'system';
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
      await this.configRepository.save(config);

      // 👈 ACTUALIZAR CONTADOR DE LA INSTANCIA
      if (instanciaId) {
        await this.instanciasService.actualizarContador(instanciaId);
      }
    }
  }
}
