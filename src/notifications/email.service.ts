// src/notifications/email.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turno } from '../turnos/entities/turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Centro } from '../centro/entities/centro.entity';
import { CreateSolicitudDto } from '../solicitudes/dto/create-solicitud.dto';
// 👈 CORREGIDO: ruta correcta al archivo
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Usuario as UsuarioEntity } from '../usuarios/entities/usuario.entity';

@Injectable()
export class EmailService {
  private apiKey: string | undefined;

  constructor(
    @InjectRepository(NegocioUsuarioRol)
    private readonly negocioUsuarioRolRepository: Repository<NegocioUsuarioRol>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepository: Repository<UsuarioEntity>,
  ) {
    this.apiKey = process.env.KEPLARS_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️ KEPLARS_API_KEY no configurada. Los emails no se enviarán.');
    } else {
      console.log('📧 Keplars API configurada correctamente');
    }
  }

  private formatearFecha(fechaStr: Date, horaStr: string, timezone: string): string {
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const diaSemana = diasSemana[fecha.getDay()];
    return `${diaSemana} ${dia}/${mes}/${anio} - ${horaStr.substring(0, 5)} hs (${timezone})`;
  }

  private formatearDireccion(centro: Centro): string {
    const partes = [
      centro.street,
      centro.street_number,
      centro.city,
      centro.state,
      centro.country,
    ].filter(Boolean);
    return partes.join(', ') || 'Dirección no disponible';
  }

  // 👈 NUEVO: Obtener el email del dueño del negocio (rolId = 7)
  private async obtenerEmailDueno(negocioId: number): Promise<string | null> {
    try {
      // Buscar la relación negocio-usuario-rol con rolId = 7 (DUEÑO)
      const relacion = await this.negocioUsuarioRolRepository.findOne({
        where: {
          negocioId: negocioId,
          rolId: 7,
          fecha_baja: null,
        },
        relations: ['usuario'],
      });

      if (relacion && relacion.usuario) {
        return relacion.usuario.email;
      }

      console.warn(`⚠️ No se encontró dueño (rolId=7) para el negocio ${negocioId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error al obtener email del dueño:`, error);
      return null;
    }
  }

  // ✅ Enviar solicitud de nuevo servicio/actividad
  async enviarEmailSolicitudServicio(solicitud: CreateSolicitudDto): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️ No se envió email de solicitud: KEPLARS_API_KEY no configurada');
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">📋 Nueva solicitud de actividad/servicio</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>👤 Nombre:</strong> ${solicitud.nombre} ${solicitud.apellido}</p>
          <p><strong>📧 Email:</strong> ${solicitud.email}</p>
          <p><strong>📱 WhatsApp:</strong> ${solicitud.whatsapp}</p>
          <p><strong>📝 Mensaje:</strong></p>
          <p style="background-color: white; padding: 10px; border-radius: 5px; margin-top: 5px;">
            ${solicitud.mensaje.replace(/\n/g, '<br>')}
          </p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Para gestionar esta solicitud, podés contactar al usuario directamente por email o WhatsApp.
        </p>
        <hr />
        <p style="color: #999; font-size: 10px;">
          Este es un mensaje automático enviado desde el formulario de solicitud de actividades/servicios.
        </p>
      </div>
    `;

    try {
      const response = await fetch('https://api.keplars.com/api/v1/send-email/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: ['pwaturnos@gmail.com'],
          subject: `📋 Nueva solicitud de actividad - ${solicitud.nombre} ${solicitud.apellido}`,
          body: html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Keplars API error (${response.status}):`, errorData);
        throw new Error(`Keplars API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`📧 Email de solicitud enviado a pwaturnos@gmail.com`);
    } catch (error) {
      console.error(`❌ Error enviando email de solicitud:`, error);
      throw error;
    }
  }

  // ✅ MODIFICADO: Enviar email de confirmación al cliente y al dueño del negocio
  async enviarEmailConfirmacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️ No se envió email de confirmación: KEPLARS_API_KEY no configurada');
      return;
    }

    const especialidadNombre = turno.profesionalCentro?.especialidad?.nombre || 'No especificada';
    const profesionalNombre = turno.profesionalCentro?.profesional?.nombre || 'No especificado';

    const fechaHoraFormateada = this.formatearFecha(
      turno.fechaTurno,
      turno.horaInicio,
      turno.timezone || centro.timezone || 'America/Argentina/Buenos_Aires'
    );

    const ubicacion = centro.es_virtual
      ? `<strong>🔗 Videollamada:</strong> <a href="${turno.videollamadaUrl}">${turno.videollamadaUrl}</a>`
      : `<strong>📍 Dirección:</strong> ${this.formatearDireccion(centro)}`;

    const whatsappCentro = centro.whatsapp_e164 
      ? `<p><strong>📱 WhatsApp Centro:</strong> <a href="https://wa.me/${centro.whatsapp_e164}">${centro.whatsapp_e164}</a></p>`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Turno confirmado</h2>
        <p>Hola <strong>${usuario.nombre} ${usuario.apellido}</strong>,</p>
        <p>Tu turno ha sido reservado con éxito. A continuación los detalles:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>👨‍⚕️ Profesional:</strong> ${profesionalNombre}</p>
          <p><strong>📋 Especialidad:</strong> ${especialidadNombre}</p>
          <p><strong>🏥 Centro:</strong> ${centro.nombre}</p>
          ${whatsappCentro}
          <p><strong>📅 Fecha y hora:</strong> ${fechaHoraFormateada}</p>
          ${ubicacion}
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Si tenés alguna duda, comunicate con el centro.
        </p>
        <hr />
        <p style="color: #999; font-size: 10px;">
          Este es un mensaje automático, por favor no responder.
        </p>
      </div>
    `;

    // 👈 Obtener el email del dueño del negocio
    const negocioId = centro.negocioId;
    const emailDueno = await this.obtenerEmailDueno(negocioId);

    // 👈 Construir lista de destinatarios
    const destinatarios = [usuario.email];
    if (emailDueno) {
      destinatarios.push(emailDueno);
      console.log(`📧 Se enviará copia al dueño del negocio: ${emailDueno}`);
    } else {
      console.warn(`⚠️ No se encontró dueño para el negocio ${negocioId}, enviando solo al cliente`);
    }

    try {
      const response = await fetch('https://api.keplars.com/api/v1/send-email/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: destinatarios,
          subject: `[CONFIRMADO] Turno - ${fechaHoraFormateada}`,
          body: html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Keplars API error (${response.status}):`, errorData);
        throw new Error(`Keplars API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`📧 Email de confirmación enviado a: ${destinatarios.join(', ')} para turno ${turno.id}. Respuesta:`, data);
    } catch (error) {
      console.error(`❌ Error enviando email a ${usuario.email}:`, error);
      throw error;
    }
  }

  async enviarEmailCancelacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️ No se envió email de cancelación: KEPLARS_API_KEY no configurada');
      return;
    }

    const especialidadNombre = turno.profesionalCentro?.especialidad?.nombre || 'No especificada';
    const profesionalNombre = turno.profesionalCentro?.profesional?.nombre || 'No especificado';

    const fechaHoraFormateada = this.formatearFecha(
      turno.fechaTurno,
      turno.horaInicio,
      turno.timezone || centro.timezone || 'America/Argentina/Buenos_Aires'
    );

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">❌ Turno cancelado</h2>
        <p>Hola <strong>${usuario.nombre} ${usuario.apellido}</strong>,</p>
        <p>Lamentamos informarte que tu turno ha sido <strong>CANCELADO</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>👨‍⚕️ Profesional:</strong> ${profesionalNombre}</p>
          <p><strong>📋 Especialidad:</strong> ${especialidadNombre}</p>
          <p><strong>🏥 Centro:</strong> ${centro.nombre}</p>
          <p><strong>📅 Fecha y hora:</strong> ${fechaHoraFormateada}</p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Si no solicitaste esta cancelación o tenés alguna duda, comunicate con el centro.
        </p>
        <hr />
        <p style="color: #999; font-size: 10px;">
          Este es un mensaje automático, por favor no responder.
        </p>
      </div>
    `;

    // 👈 Obtener el email del dueño del negocio
    const negocioId = centro.negocioId;
    const emailDueno = await this.obtenerEmailDueno(negocioId);

    // 👈 Construir lista de destinatarios
    const destinatarios = [usuario.email];
    if (emailDueno) {
      destinatarios.push(emailDueno);
      console.log(`📧 Se enviará copia de cancelación al dueño del negocio: ${emailDueno}`);
    }

    try {
      const response = await fetch('https://api.keplars.com/api/v1/send-email/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: destinatarios,
          subject: `[CANCELADO] Turno - ${fechaHoraFormateada}`,
          body: html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Keplars API error (${response.status}):`, errorData);
        throw new Error(`Keplars API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`📧 Email de cancelación enviado a: ${destinatarios.join(', ')} para turno ${turno.id}. Respuesta:`, data);
    } catch (error) {
      console.error(`❌ Error enviando email de cancelación a ${usuario.email}:`, error);
      throw error;
    }
  }

  // ✅ NUEVO: Enviar email de bienvenida al dueño del negocio
  async enviarEmailBienvenidaNegocio(params: {
    email: string;
    nombreNegocio: string;
    urlPublica: string;
    urlGestion: string;
  }): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️ No se envió email de bienvenida: KEPLARS_API_KEY no configurada');
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ ¡Tu negocio está configurado!</h2>
        
        <p>Hola,</p>
        
        <p>Felicitaciones, tu negocio <strong>${params.nombreNegocio}</strong> ya está configurado en nuestra plataforma.</p>
        
        <p>Compartí estos enlaces para empezar a recibir turnos:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>📢 Link Público (para redes sociales):</strong></p>
          <p><a href="${params.urlPublica}" style="color: #2196F3; word-break: break-all;">${params.urlPublica}</a></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;" />
          
          <p><strong>⚙️ Link de Gestión (para administrar):</strong></p>
          <p><a href="${params.urlGestion}" style="color: #2196F3; word-break: break-all;">${params.urlGestion}</a></p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Guardá estos enlaces en un lugar seguro. El link de gestión te permite ver y administrar todos los turnos de tu negocio.
        </p>
        
        <hr />
        <p style="color: #999; font-size: 12px;">
          Este es un mensaje automático enviado desde el sistema de gestión de turnos.
          Por favor, no responder a este email.
        </p>
      </div>
    `;

    try {
      // Enviar al dueño del negocio
      const response1 = await fetch('https://api.keplars.com/api/v1/send-email/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: [params.email],
          subject: `✅ Tu negocio "${params.nombreNegocio}" está configurado`,
          body: html,
        }),
      });

      if (!response1.ok) {
        const errorData = await response1.json();
        console.error(`❌ Keplars API error (dueño):`, errorData);
      } else {
        console.log(`📧 Email de bienvenida enviado a ${params.email}`);
      }

      // Enviar copia a pwaturnos@gmail.com
      const response2 = await fetch('https://api.keplars.com/api/v1/send-email/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: ['pwaturnos@gmail.com'],
          subject: `📋 Nuevo negocio registrado: "${params.nombreNegocio}"`,
          body: html,
        }),
      });

      if (!response2.ok) {
        const errorData = await response2.json();
        console.error(`❌ Keplars API error (copia):`, errorData);
      } else {
        console.log(`📧 Email de bienvenida enviado a pwaturnos@gmail.com (copia)`);
      }

    } catch (error) {
      console.error(`❌ Error enviando email de bienvenida:`, error);
      throw error;
    }
  }
}
