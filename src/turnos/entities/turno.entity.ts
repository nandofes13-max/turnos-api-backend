import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Centro } from '../../centro/entities/centro.entity';
import { ProfesionalCentro } from '../../profesional-centro/entities/profesional-centro.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('turnos')
@Index(['profesionalCentroId', 'inicio'])
@Check(`estado IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'REPROGRAMADO', 'ATENDIDO', 'NO_SHOW', 'BLOQUEADO')`)
@Check(`moneda IN ('ARS', 'USD', 'EUR')`)
export class Turno extends BaseEntityAuditable {
  // ===== RELACIONES =====
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
  especialidadId: number;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  // ===== FECHA Y HORA =====
  @Column({ type: 'timestamp' })
  @Index()
  inicio: Date;

  @Column({ type: 'timestamp' })
  @Index()
  fin: Date;

  @Column({ name: 'duracion_minutos', type: 'int' })
  duracionMinutos: number;

  // ===== ESTADO =====
  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado: string;

  // ===== PRECIO =====
  @Column({ name: 'precio_reserva', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioReserva: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS', nullable: true })
  moneda: string;

  // ===== CONFIRMACIÓN =====
  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'confirmado_at', type: 'timestamp', nullable: true })
  confirmadoAt: Date;

  // ===== CANCELACIÓN =====
  @Column({ name: 'cancelado_at', type: 'timestamp', nullable: true })
  canceladoAt: Date;

  @Column({ name: 'cancelado_por', type: 'varchar', length: 30, nullable: true })
  canceladoPor: string;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string;

  // ===== REPROGRAMACIÓN =====
  @Column({ name: 'reprogramado_desde_id', type: 'bigint', nullable: true })
  reprogramadoDesdeId: number;

  // ===== ASISTENCIA =====
  @Column({ default: false })
  asistio: boolean;

  @Column({ name: 'llegada_at', type: 'timestamp', nullable: true })
  llegadaAt: Date;

  // ===== CANAL DE ORIGEN =====
  @Column({ name: 'canal_origen', type: 'varchar', length: 30, default: 'WEB' })
  canalOrigen: string;

  // ===== OBSERVACIONES =====
  @Column({ type: 'text', nullable: true })
  observaciones: string;
}
