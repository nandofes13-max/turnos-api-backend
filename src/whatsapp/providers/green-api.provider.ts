// src/whatsapp/providers/green-api.provider.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WhatsappProvider, NuevoTurnoWhatsappPayload } from '../interfaces/whatsapp-provider.interface';
import { WhatsappConfig } from '../entities/whatsapp-config.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { InstanciaWhatsapp } from '../entities/instancia-whatsapp.entity';

@Injectable()
export class GreenApiProvider implements WhatsappProvider {
  private readonly API_BASE_URL = 'https://api.green-api.com';

  constructor(
    @InjectRepository(WhatsappConfig)
    private readonly configRepository: Repository<WhatsappConfig>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    @InjectRepository(InstanciaWhatsapp)
    private readonly instanciaRepository: Repository<InstanciaWhatsapp>,
  ) {}

  /**
   * Obtiene la configuración de WhatsApp de un negocio
   */
  private async obtenerConfiguracion(negocioId: number): Promise<{ config: WhatsappConfig; instanceId: string; apiToken: string }> {
    const config = await this.configRepository.findOne({
      where: { negocioId, activo: true },
    });

    if (!config) {
      throw new NotFoundException(
        `El negocio ID ${negocioId} no tiene configuración de WhatsApp activa.`
      );
    }

    if (!config.instanciaId) {
      throw new BadRequestException(
        `La configuración de WhatsApp del negocio ID ${negocioId} no tiene una instancia asignada.`
      );
    }

    const instancia = await this.instanciaRepository.findOne({
      where: { id: config.instanciaId },
    });

    if (!instancia) {
      throw new NotFoundException(
        `Instancia ID ${config.instanciaId} no encontrada.`
      );
    }

    if (!instancia.instanceId || !instancia.apiToken) {
      throw new BadRequestException(
        `La instancia ID ${config.instanciaId} tiene credenciales incompletas.`
      );
    }

    return {
      config,
      instanceId: instancia.instanceId,
      apiToken: instancia.apiToken,
    };
  }

  /**
   * Envía una notificación de nuevo turno usando GREEN API
   */
  async enviarNuevoTurno(
    negocioId: number,
    payload: NuevoTurnoWhatsappPayload,
  ): Promise<void> {
    const { config, instanceId, apiToken } = await this.obtenerConfiguracion(negocioId);

    if (!config.phoneNumber) {
      throw new BadRequestException(
        `El negocio ID ${negocioId} no tiene un número de WhatsApp configurado.`
      );
    }

    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });

    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${negocioId} no encontrado`);
    }

    const mensaje = this.construirMensajeTurno(payload, negocio.urlGestion);
    await this.enviarMensaje(instanceId, apiToken, config.phoneNumber, mensaje);
  }

  /**
   * Envía un mensaje de prueba usando GREEN API
   */
  async enviarMensajePrueba(negocioId: number): Promise<void> {
    const { config, instanceId, apiToken } = await this.obtenerConfiguracion(negocioId);

    if (!config.phoneNumber) {
      throw new BadRequestException(
        `El negocio ID ${negocioId} no tiene un número de WhatsApp configurado.`
      );
    }

    const mensajePrueba = `
✅ PWA-Turnos: alertas de turnos activadas correctamente

Recibirás un mensaje como este cada vez que un cliente reserve un turno en tu negocio.

📌 Para más información, ingresa a tu panel de gestión.
    `.trim();

    await this.enviarMensaje(instanceId, apiToken, config.phoneNumber, mensajePrueba);
  }

  /**
   * Valida la conexión con GREEN API usando la configuración del negocio
   */
  async validarConexion(negocioId: number): Promise<boolean> {
    try {
      const { config, instanceId, apiToken } = await this.obtenerConfiguracion(negocioId);
      const esValido = await this.validarConexionConCredenciales(instanceId, apiToken);
      
      config.estado = esValido ? 'authorized' : 'error';
      config.ultimaPrueba = new Date();
      await this.configRepository.save(config);
      
      return esValido;
    } catch (error) {
      console.error('Error validando conexión GREEN API:', error.message);
      return false;
    }
  }

  /**
   * Valida la conexión con GREEN API usando credenciales específicas
   */
  async validarConexionConCredenciales(instanceId: string, apiToken: string): Promise<boolean> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${instanceId}/getStateInstance/${apiToken}`;
      const response = await axios.get(url);
      
      const stateInstance = response.data?.stateInstance;
      const esValido = stateInstance === 'authorized' || stateInstance === 'online';
      
      console.log(`[GreenApiProvider] Validando instancia ${instanceId}: estado=${stateInstance}, válido=${esValido}`);
      
      return esValido;
    } catch (error) {
      console.error('[GreenApiProvider] Error validando credenciales:', error.message);
      return false;
    }
  }

  /**
   * Envía un mensaje usando GREEN API
   * 👈 CON LOGS MEJORADOS
   */
  private async enviarMensaje(
    instanceId: string,
    apiToken: string,
    phoneNumber: string,
    mensaje: string,
  ): Promise<void> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${instanceId}/sendMessage/${apiToken}`;
      
      const body = {
        chatId: `${phoneNumber}@c.us`,
        message: mensaje,
      };

      // 👈 LOG DETALLADO ANTES DE ENVIAR
      console.log('📤 Enviando mensaje a GREEN API:');
      console.log('  URL:', url);
      console.log('  phoneNumber:', phoneNumber);
      console.log('  chatId:', body.chatId);
      console.log('  message:', body.message.substring(0, 100) + '...');

      const response = await axios.post(url, body);
      
      if (!response.data?.idMessage) {
        throw new Error('GREEN API no devolvió idMessage');
      }

      console.log(`✅ Mensaje WhatsApp enviado a ${phoneNumber}: ID ${response.data.idMessage}`);
    } catch (error) {
      // 👈 LOG MEJORADO DEL ERROR
      console.error('❌ Error enviando mensaje WhatsApp:');
      console.error('  Status:', error.response?.status);
      console.error('  Data:', error.response?.data);
      console.error('  Message:', error.message);
      console.error('  Body enviado:', JSON.stringify(error.config?.data || {}, null, 2));
      throw new Error(`Error al enviar mensaje: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Construye el mensaje de notificación de turno
   */
  private construirMensajeTurno(payload: NuevoTurnoWhatsappPayload, urlGestion: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://turnos-pwa-frontend.onrender.com';
    const enlaceGestion = `${frontendUrl}/gestion/turnos/${urlGestion}`;

    let mensaje = `
🔔 Nuevo turno reservado

Cliente: ${payload.cliente}
Fecha: ${payload.fecha}
Hora: ${payload.hora}
    `.trim();

    if (payload.telefono) {
      mensaje += `\nTeléfono: ${payload.telefono}`;
    }

    mensaje += `\n\n📊 Gestiona aquí: ${enlaceGestion}`;

    return mensaje;
  }

  /**
   * Obtiene la configuración de WhatsApp de un negocio (público para uso del controller)
   */
  async obtenerConfiguracionPublica(negocioId: number): Promise<WhatsappConfig | null> {
    return this.configRepository.findOne({
      where: { negocioId },
    });
  }

  /**
   * Guarda o actualiza la configuración de WhatsApp de un negocio
   * @deprecated Este método ya no se usa. Usar WhatsappService.guardarConfiguracion()
   */
  async guardarConfiguracion(
    negocioId: number,
    instanceId: string,
    apiToken: string,
    phoneNumber?: string,
    provider: string = 'greenapi',
  ): Promise<WhatsappConfig> {
    let config = await this.configRepository.findOne({
      where: { negocioId },
    });

    let phoneNumberFromApi: string | null = null;
    try {
      const url = `${this.API_BASE_URL}/waInstance${instanceId}/getWaSettings/${apiToken}`;
      const response = await axios.get(url);
      if (response.data && response.data.phone) {
        phoneNumberFromApi = response.data.phone;
        console.log(`[GreenApiProvider] Número obtenido de GREEN API: ${phoneNumberFromApi}`);
      }
    } catch (error) {
      console.warn('[GreenApiProvider] No se pudo obtener el número de GREEN API:', error.message);
    }

    const phoneNumberFinal = phoneNumberFromApi || phoneNumber || null;

    if (config) {
      config.instanceId = instanceId;
      config.apiToken = apiToken;
      config.phoneNumber = phoneNumberFinal;
      config.provider = provider;
      config.activo = true;
      config.estado = 'pending';
      config.usuario_modificacion = 'system';
      config.fecha_modificacion = new Date();
    } else {
      config = this.configRepository.create({
        negocioId,
        instanceId,
        apiToken,
        phoneNumber: phoneNumberFinal,
        provider,
        activo: true,
        estado: 'pending',
        usuario_alta: 'system',
        fecha_alta: new Date(),
      });
    }

    await this.configRepository.save(config);
    return config;
  }
}
