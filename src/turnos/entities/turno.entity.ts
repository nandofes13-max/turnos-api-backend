import { Entity, Column, ManyToOne, JoinColumn, Index, Check, AfterLoad } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Centro } from '../../centro/entities/centro.entity';
import { ProfesionalCentro } from '../../profesional-centro/entities/profesional-centro.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { NegocioEstadoTurno } from '../../negocios-estados-turno/entities/negocio-estado-turno.entity';
import { NegocioEstadoPago } from '../../negocios-estados-pago/entities/negocio-estado-pago.entity';

@Entity('turnos')
@Index(['profesionalCentroId', 'fecha_turno', 'hora_inicio'])
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

  // 🔹 NUEVOS CAMPOS DE HORARIO (compatibles con agenda_disponibilidad)
  @Column({ name: 'fecha_turno', type: 'date' })
  fechaTurno: Date;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ name: 'duracion_minutos', type: 'int' })
  duracionMinutos: number;

  // 🔹 Relación con la tabla de estados de turno
  @Column({ name: 'estado_turno_id', nullable: true })
  estadoTurnoId: number | null;

  @ManyToOne(() => NegocioEstadoTurno)
  @JoinColumn({ name: 'estado_turno_id' })
  estadoTurno: NegocioEstadoTurno;

  @Column({ name: 'precio_reserva', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioReserva: number | null;

  @Column({ type: 'varchar', length: 3, default: 'ARS', nullable: true })
  moneda: string | null;

  // 🔹 Relación con la tabla de estados de pago
  @Column({ name: 'estado_pago_id', nullable: true })
  estadoPagoId: number | null;

  @ManyToOne(() => NegocioEstadoPago)
  @JoinColumn({ name: 'estado_pago_id' })
  estadoPago: NegocioEstadoPago;

  @Column({ name: 'cancelado_at', type: 'timestamp', nullable: true })
  canceladoAt: Date | null;

  @Column({ name: 'cancelado_por', type: 'varchar', length: 30, nullable: true })
  canceladoPor: string | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @Column({ name: 'reprogramado_desde_id', type: 'bigint', nullable: true })
  reprogramadoDesdeId: number | null;

  @Column({ default: false })
  asistio: boolean;

  @Column({ name: 'llegada_at', type: 'timestamp', nullable: true })
  llegadaAt: Date | null;

  @Column({ name: 'canal_origen', type: 'varchar', length: 30, default: 'WEB' })
  canalOrigen: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  // 🔹 Campo virtual que devuelve el nombre del estado del turno
  estado: string;

  @AfterLoad()
  setEstado() {
    this.estado = this.estadoTurno?.nombre || 'SIN ESTADO';
  }
}
