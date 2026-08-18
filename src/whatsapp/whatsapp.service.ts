// src/whatsapp/whatsapp.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappProvider, NuevoTurnoWhatsappPayload } from './interfaces/whatsapp-provider.interface';
import { GreenApiProvider } from './providers/green-api.provider';
import { WhatsappConfig } from './entities/whatsapp-config.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { InstanciasWhatsappService } from './instancias-whatsapp.service';
import { normalizePhoneNumber } from '../common/utils/phone-utils';

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
   * Envía una notificación de nuevo turno y actualiza el contador
   */
  async enviarNuevoTurno(
    negocioId: number,
    payload: NuevoTurnoWhatsappPayload,
  ): Promise<void> {
    try {
      const provider = await this.obtenerProveedor(negocioId);
      await provider.enviarNuevoTurno(negocioId, payload);

      const config = await this.configRepository.findOne({
        where: { negocioId, activo: true },
      });
      if (config && config.instanciaId) {
        await this.instanciasService.actualizarContador(config.instanciaId);
        console.log(`📦 [enviarNuevoTurno] Contador de instancia ${config.instanciaId} actualizado`);
      }
    } catch (error) {
      console.error(`❌ Error enviando notificación WhatsApp al negocio ${negocioId}:`, error.message);
    }
  }

  /**
   * Envía un mensaje de prueba
   */
  async enviarMensajePrueba(negocioId: number): Promise<void> {
    const provider = await this.obtenerProveedor(negocioId);
    await provider.enviarMensajePrueba(negocioId);
  }

  /**
   * Valida la conexión con el proveedor configurado
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
   * 👈 AHORA LIMPIA FECHA_BAJA AL REACTIVAR (como en NegociosService)
   */
  async guardarConfiguracion(
    negocioId: number,
    phoneNumber?: string,
    provider: string = 'greenapi',
  ): Promise<WhatsappConfig> {
    console.log(`📦 [guardarConfiguracion] Iniciando para negocio ID ${negocioId}`);
    
    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${negocioId} no encontrado`);
    }
    console.log(`📦 [guardarConfiguracion] Negocio encontrado: ${negocio.nombre}`);

    const instancia = await this.instanciasService.findDisponible();
    if (!instancia) {
      throw new BadRequestException(
        'No hay instancias de WhatsApp disponibles. Contactá al administrador.'
      );
    }
    console.log(`📦 [guardarConfiguracion] Instancia encontrada: ID ${instancia.id}`);
    console.log(`📦 [guardarConfiguracion] Instancia - instanceId: ${instancia.instanceId}`);
    console.log(`📦 [guardarConfiguracion] Instancia - apiToken: ${instancia.apiToken ? '***' : 'null'}`);
    console.log(`📦 [guardarConfiguracion] Instancia - numeroWhatsapp: ${instancia.numeroWhatsapp}`);
    console.log(`📦 [guardarConfiguracion] Instancia - negociosActivos: ${instancia.negociosActivos}`);
    console.log(`📦 [guardarConfiguracion] Instancia - estado: ${instancia.estado}`);

    let config = await this.configRepository.findOne({
      where: { negocioId },
    });

    let phoneNumberFinal: string | null = null;
    try {
      if (phoneNumber) {
        phoneNumberFinal = normalizePhoneNumber(phoneNumber);
      } else if (negocio.whatsapp_e164) {
        phoneNumberFinal = normalizePhoneNumber(negocio.whatsapp_e164);
      }
    } catch (error) {
      console.error('❌ Error normalizando número:', error.message);
      throw new BadRequestException(`Número de teléfono inválido: ${error.message}`);
    }
    console.log(`📦 [guardarConfiguracion] phoneNumberFinal: ${phoneNumberFinal}`);

    if (config) {
      console.log(`📦 [guardarConfiguracion] Actualizando configuración existente ID ${config.id}`);
      config.phoneNumber = phoneNumberFinal;
      config.provider = provider;
      config.activo = true;
      config.estado = 'pending';
      config.instanciaId = instancia.id;
      config.instanceId = instancia.instanceId;
      config.apiToken = instancia.apiToken;
      
      // 👈 LIMPIAR FECHA_BAJA AL REACTIVAR (como en NegociosService)
      config.fecha_baja = null;
      config.usuario_baja = null;
      
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
    } else {
      console.log(`📦 [guardarConfiguracion] Creando nueva configuración`);
      config = this.configRepository.create({
        negocioId,
        phoneNumber: phoneNumberFinal,
        provider,
        activo: true,
        estado: 'pending',
        instanciaId: instancia.id,
        instanceId: instancia.instanceId,
        apiToken: instancia.apiToken,
        usuario_alta: 'system',
        fecha_alta: new Date(),
      });
    }

    console.log(`📦 [guardarConfiguracion] Configuración a guardar:`);
    console.log(`  - instanceId: ${config.instanceId}`);
    console.log(`  - apiToken: ${config.apiToken ? '***' : 'null'}`);
    console.log(`  - instanciaId: ${config.instanciaId}`);
    console.log(`  - phoneNumber: ${config.phoneNumber}`);

    const configGuardada = await this.configRepository.save(config);
    console.log(`📦 [guardarConfiguracion] Configuración guardada con ID ${configGuardada.id}`);

    await this.instanciasService.actualizarContador(instancia.id);
    console.log(`📦 [guardarConfiguracion] Contador de instancia actualizado`);

    return configGuardada;
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

  // ============================================================
  // 👈 MÉTODOS PARA GESTIONAR EL ACCESO A WHATSAPP
  // ============================================================

  async obtenerAcceso(negocioId: number): Promise<boolean> {
    const config = await this.configRepository.findOne({
      where: { negocioId },
    });
    return config?.accesoWhatsapp || false;
  }

  async actualizarAcceso(negocioId: number, acceso: boolean): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { negocioId },
    });
    if (!config) {
      throw new NotFoundException(
        `Configuración de WhatsApp para negocio ID ${negocioId} no encontrada.`
      );
    }
    config.accesoWhatsapp = acceso;
    await this.configRepository.save(config);
    console.log(`📦 [actualizarAcceso] Negocio ID ${negocioId}: acceso = ${acceso}`);
  }
}
