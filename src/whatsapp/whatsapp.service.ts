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
    const config = await this.configRepository.findOne({
      where: { negocioId, activo: true },
    });

    if (config && config.phoneNumber) {
      return config.phoneNumber;
    }

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

    switch (config.provider) {
      case 'greenapi':
        return this.greenApiProvider;
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
      const config = await this.configRepository.findOne({
        where: { negocioId, activo: true },
      });
      
      if (!config || !config.instanciaId) {
        console.error(`❌ El negocio ${negocioId} no tiene instancia asignada`);
        return false;
      }
      
      const instancia = await this.instanciasService.findOne(config.instanciaId);
      
      if (!instancia) {
        console.error(`❌ Instancia ${config.instanciaId} no encontrada`);
        return false;
      }
      
      const esValido = await this.greenApiProvider.validarConexionConCredenciales(
        instancia.instanceId,
        instancia.apiToken
      );
      
      config.estado = esValido ? 'authorized' : 'error';
      config.ultimaPrueba = new Date();
      await this.configRepository.save(config);
      
      return esValido;
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
   * 👈 AHORA COPIA LAS CREDENCIALES DE LA INSTANCIA
   */
  async guardarConfiguracion(
    negocioId: number,
    phoneNumber?: string,
    provider: string = 'greenapi',
  ): Promise<WhatsappConfig> {
    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${negocioId} no encontrado`);
    }

    const instancia = await this.instanciasService.findDisponible();
    if (!instancia) {
      throw new BadRequestException(
        'No hay instancias de WhatsApp disponibles. Contactá al administrador.'
      );
    }

    let config = await this.configRepository.findOne({
      where: { negocioId },
    });

    let phoneNumberFinal: string | null = null;
    if (phoneNumber) {
      phoneNumberFinal = phoneNumber.replace(/^\+/, '');
    } else if (negocio.whatsapp_e164) {
      phoneNumberFinal = negocio.whatsapp_e164.replace(/^\+/, '');
    }

    if (config) {
      // 👈 ACTUALIZAR INCLUYENDO CREDENCIALES DE LA INSTANCIA
      config.phoneNumber = phoneNumberFinal;
      config.provider = provider;
      config.activo = true;
      config.estado = 'pending';
      config.instanciaId = instancia.id;
      config.instanceId = instancia.instanceId; // 👈 COPIAR
      config.apiToken = instancia.apiToken;     // 👈 COPIAR
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
    } else {
      // 👈 CREAR INCLUYENDO CREDENCIALES DE LA INSTANCIA
      config = this.configRepository.create({
        negocioId,
        phoneNumber: phoneNumberFinal,
        provider,
        activo: true,
        estado: 'pending',
        instanciaId: instancia.id,
        instanceId: instancia.instanceId, // 👈 COPIAR
        apiToken: instancia.apiToken,     // 👈 COPIAR
        usuario_alta: 'system',
        fecha_alta: new Date(),
      });
    }

    await this.configRepository.save(config);
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

      if (instanciaId) {
        await this.instanciasService.actualizarContador(instanciaId);
      }
    }
  }
}
