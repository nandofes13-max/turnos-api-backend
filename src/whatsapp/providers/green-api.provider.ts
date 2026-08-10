// src/whatsapp/providers/green-api.provider.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WhatsappProvider, NuevoTurnoWhatsappPayload } from '../interfaces/whatsapp-provider.interface';
import { WhatsappConfig } from '../entities/whatsapp-config.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';

@Injectable()
export class GreenApiProvider implements WhatsappProvider {
  private readonly API_BASE_URL = 'https://api.green-api.com';

  constructor(
    @InjectRepository(WhatsappConfig)
    private readonly configRepository: Repository<WhatsappConfig>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
  ) {}

  /**
   * Obtiene la configuración de WhatsApp de un negocio
   * @throws NotFoundException si el negocio no tiene configuración
   */
  private async obtenerConfiguracion(negocioId: number): Promise<WhatsappConfig> {
    const config = await this.configRepository.findOne({
      where: { negocioId, activo: true },
    });

    if (!config) {
      throw new NotFoundException(
        `El negocio ID ${negocioId} no tiene configuración de WhatsApp activa.`
      );
    }

    if (!config.instanceId || !config.apiToken) {
      throw new BadRequestException(
        `La configuración de WhatsApp del negocio ID ${negocioId} está incompleta.`
      );
    }

    return config;
  }

  /**
   * Obtiene el número de teléfono del negocio (desde GREEN API)
   * Usa getWaSettings que devuelve el campo "phone"
   * @throws Error si no se puede obtener el número
   */
  private async obtenerNumeroTelefono(config: WhatsappConfig): Promise<string> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${config.instanceId}/getWaSettings/${config.apiToken}`;
      console.log(`[GreenApiProvider] Consultando getWaSettings para instancia ${config.instanceId}`);
      
      const response = await axios.get(url);
      console.log(`[GreenApiProvider] Respuesta de getWaSettings:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.phone) {
        console.log(`[GreenApiProvider] Número obtenido: ${response.data.phone}`);
        return response.data.phone;
      }
      
      if (config.phoneNumber) {
        console.log(`[GreenApiProvider] Usando phoneNumber de la configuración: ${config.phoneNumber}`);
        return config.phoneNumber;
      }
      
      throw new Error('No se pudo obtener el número de teléfono de GREEN API');
    } catch (error) {
      console.error('[GreenApiProvider] Error obteniendo número de GREEN API:', error.message);
      if (config.phoneNumber) {
        return config.phoneNumber;
      }
      throw new Error('No se pudo obtener el número de teléfono del negocio');
    }
  }

  /**
   * Envía una notificación de nuevo turno usando GREEN API
   */
  async enviarNuevoTurno(
    negocioId: number,
    payload: NuevoTurnoWhatsappPayload,
  ): Promise<void> {
    const config = await this.obtenerConfiguracion(negocioId);
    const phoneNumber = await this.obtenerNumeroTelefono(config);

    // 👈 OBTENER EL NEGOCIO PARA EL ENLACE DE GESTIÓN
    const negocio = await this.negocioRepository.findOne({
      where: { id: negocioId },
    });

    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${negocioId} no encontrado`);
    }

    // 📝 Construir mensaje con el enlace de gestión
    const mensaje = this.construirMensajeTurno(payload, negocio.urlGestion);

    // 📤 Enviar mensaje con sonido
    await this.enviarMensaje(config, phoneNumber, mensaje);
  }

  /**
   * Envía un mensaje de prueba usando GREEN API
   */
  async enviarMensajePrueba(negocioId: number): Promise<void> {
    const config = await this.obtenerConfiguracion(negocioId);
    const phoneNumber = await this.obtenerNumeroTelefono(config);

    const mensajePrueba = `
✅ PWA-Turnos: alertas de turnos activadas correctamente

Recibirás un mensaje como este cada vez que un cliente reserve un turno en tu negocio.

📌 Para más información, ingresa a tu panel de gestión.
    `.trim();

    await this.enviarMensaje(config, phoneNumber, mensajePrueba);
  }

  /**
   * Valida la conexión con GREEN API
   */
  async validarConexion(negocioId: number): Promise<boolean> {
    try {
      const config = await this.obtenerConfiguracion(negocioId);
      
      if (!config.instanceId || !config.apiToken) {
        return false;
      }

      const url = `${this.API_BASE_URL}/waInstance${config.instanceId}/getStateInstance/${config.apiToken}`;
      const response = await axios.get(url);
      
      const stateInstance = response.data?.stateInstance;
      const esAutorizado = stateInstance === 'authorized' || stateInstance === 'online';
      
      config.estado = esAutorizado ? 'authorized' : 'error';
      config.ultimaPrueba = new Date();
      await this.configRepository.save(config);
      
      return esAutorizado;
    } catch (error) {
      console.error('Error validando conexión GREEN API:', error.message);
      return false;
    }
  }

  /**
   * Envía un mensaje usando GREEN API
   * 👈 AHORA CON SONIDO
   */
  private async enviarMensaje(
    config: WhatsappConfig,
    phoneNumber: string,
    mensaje: string,
  ): Promise<void> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${config.instanceId}/sendMessage/${config.apiToken}`;
      
      const body = {
        chatId: `${phoneNumber}@c.us`,
        message: mensaje,
        notification: { sound: "default" }, // 👈 SONIDO
      };

      const response = await axios.post(url, body);
      
      if (!response.data?.idMessage) {
        throw new Error('GREEN API no devolvió idMessage');
      }

      console.log(`✅ Mensaje WhatsApp enviado a ${phoneNumber}: ID ${response.data.idMessage}`);
    } catch (error) {
      console.error('❌ Error enviando mensaje WhatsApp:', error.message);
      throw new Error(`Error al enviar mensaje: ${error.message}`);
    }
  }

  /**
   * Construye el mensaje de notificación de turno
   * 👈 SIN EMOJI Y CON ENLACE DE GESTIÓN
   */
  private construirMensajeTurno(payload: NuevoTurnoWhatsappPayload, urlGestion: string): string {
    // 📝 Construir el enlace completo de gestión
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
