import { Entity, Column, ManyToOne, JoinColumn, Index, Check, AfterLoad, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Centro } from '../../centro/entities/centro.entity';
import { ProfesionalCentro } from '../../profesional-centro/entities/profesional-centro.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { NegocioEstadoTurno } from '../../negocios-estados-turno/entities/negocio-estado-turno.entity';
import { NegocioEstadoPago } from '../../negocios-estados-pago/entities/negocio-estado-pago.entity';

@Entity('turnos')
@Unique(['profesionalCentroId', 'fechaTurno', 'horaInicio'])
@Unique(['usuarioId', 'fechaTurno', 'horaInicio'])
@Index(['profesionalCentroId'])
@Index(['fechaTurno'])
@Index(['estadoTurnoId'])
@Index(['usuarioId'])
@Index(['centroId'])
@Check(`moneda IN ('ARS', 'USD', 'EUR')`)
export class Turno extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'centro_id' })
  centroId: number;

  @ManyToOne(() => Centro)
  @JoinColumn({ name: 'centro_id' })
  centro: Centro;

  @Column({ name: 'profesional_centro_id' })
  profesionalCentroId: number;

  @ManyToOne(() => ProfesionalCentro)
  @JoinColumn({ name: 'profesional_centro_id' })
  profesionalCentro: ProfesionalCentro;

  @Column({ name: 'especialidad_id', nullable: true })
  especialidadId: number | null;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'fecha_turno', type: 'date' })
  fechaTurno: Date;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ name: 'duracion_minutos', type: 'int' })
  duracionMinutos: number;

  @Column({ name: 'estado_turno_id', nullable: true })
  estadoTurnoId: number | null;

  @ManyToOne(() => NegocioEstadoTurno)
  @JoinColumn({ name: 'estado_turno_id' })
  estadoTurno: NegocioEstadoTurno;

  @Column({ name: 'precio_reserva', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioReserva: number | null;

  @Column({ type: 'varchar', length: 3, default: 'ARS', nullable: true })
  moneda: string | null;

  @Column({ name: 'estado_pago_id', nullable: true })
  estadoPagoId: number | null;

  @ManyToOne(() => NegocioEstadoPago)
  @JoinColumn({ name: 'estado_pago_id' })
  estadoPago: NegocioEstadoPago;

  @Column({ default: false })
  asistio: boolean;

  @Column({ name: 'llegada_at', type: 'timestamp', nullable: true })
  llegadaAt: Date | null;

  @Column({ name: 'canal_origen', type: 'varchar', length: 30, default: 'WEB' })
  canalOrigen: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'timezone', length: 50, nullable: true, default: 'America/Argentina/Buenos_Aires' })
  timezone: string;

  // ✅ NUEVO: URL de videollamada (para turnos virtuales)
  @Column({ name: 'videollamada_url', type: 'varchar', length: 255, nullable: true })
  videollamadaUrl: string;

  // ✅ NUEVO: Control para no enviar email dos veces
  @Column({ name: 'email_enviado', type: 'boolean', default: false })
  emailEnviado: boolean;

  estado: string;

  get ultimoMovimiento(): string {
    const timezone = this.profesionalCentro?.centro?.timezone || this.timezone || 'America/Argentina/Buenos_Aires';
    
    if (this.fecha_baja && this.usuario_baja) {
      return `${this.usuario_baja} - BAJA - ${this.formatearFechaConTimezone(this.fecha_baja, timezone)}`;
    }
    else if (this.fecha_modificacion && 
             this.usuario_modificacion &&
             (!this.fecha_alta || this.fecha_modificacion.getTime() !== this.fecha_alta.getTime())) {
      return `${this.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaConTimezone(this.fecha_modificacion, timezone)}`;
    }
    else if (this.usuario_alta) {
      return `${this.usuario_alta} - ALTA - ${this.formatearFechaConTimezone(this.fecha_alta, timezone)}`;
    }
    return 'Sin información';
  }

  private formatearFechaConTimezone(fecha: Date, timezone: string): string {
    return new Date(fecha).toLocaleString('es-AR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  @AfterLoad()
  setEstado() {
    this.estado = this.estadoTurno?.nombre || 'SIN ESTADO';
  }
}
