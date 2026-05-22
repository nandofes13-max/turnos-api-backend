import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { Turno } from '../turnos/entities/turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Centro } from '../centro/entities/centro.entity';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY no configurada. Los emails no se enviarán.');
    }
    this.resend = new Resend(apiKey || '');
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

  async enviarEmailConfirmacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
    const fechaHoraFormateada = this.formatearFecha(
      turno.fechaTurno,
      turno.horaInicio,
      turno.timezone || centro.timezone || 'America/Argentina/Buenos_Aires'
    );

    const ubicacion = centro.es_virtual
      ? `<strong>🔗 Videollamada:</strong> <a href="${turno.videollamadaUrl}">${turno.videollamadaUrl}</a>`
      : `<strong>📍 Dirección:</strong> ${this.formatearDireccion(centro)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Turno confirmado</h2>
        <p>Hola <strong>${usuario.nombre} ${usuario.apellido}</strong>,</p>
        <p>Tu turno ha sido reservado con éxito. A continuación los detalles:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>👨‍⚕️ Profesional:</strong> ${turno.profesionalCentro?.profesional?.nombre || 'No especificado'}</p>
          <p><strong>📋 Especialidad:</strong> ${turno.especialidad?.nombre || 'No especificada'}</p>
          <p><strong>🏥 Centro:</strong> ${centro.nombre}</p>
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

    try {
      await this.resend.emails.send({
        from: 'Turnos PWA <onboarding@resend.dev>',
        to: usuario.email,
        subject: `✅ Turno confirmado - ${fechaHoraFormateada}`,
        html,
      });
      console.log(`📧 Email enviado a ${usuario.email} para turno ${turno.id}`);
    } catch (error) {
      console.error(`❌ Error enviando email a ${usuario.email}:`, error);
      throw error;
    }
  }

  async enviarEmailCancelacion(turno: Turno, usuario: Usuario, centro: Centro): Promise<void> {
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
          <p><strong>👨‍⚕️ Profesional:</strong> ${turno.profesionalCentro?.profesional?.nombre || 'No especificado'}</p>
          <p><strong>📋 Especialidad:</strong> ${turno.especialidad?.nombre || 'No especificada'}</p>
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

    try {
      await this.resend.emails.send({
        from: 'Turnos PWA <onboarding@resend.dev>',
        to: usuario.email,
        subject: `❌ Turno cancelado - ${fechaHoraFormateada}`,
        html,
      });
      console.log(`📧 Email de cancelación enviado a ${usuario.email} para turno ${turno.id}`);
    } catch (error) {
      console.error(`❌ Error enviando email de cancelación a ${usuario.email}:`, error);
      throw error;
    }
  }
}
