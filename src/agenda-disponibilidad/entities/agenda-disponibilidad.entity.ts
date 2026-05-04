import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { ProfesionalCentro } from '../../profesional-centro/entities/profesional-centro.entity';

@Entity('agenda_disponibilidad')
export class AgendaDisponibilidad extends BaseEntityAuditable {
  // ❌ ELIMINAR esta línea: id: number;
  // El id ya viene de BaseEntityAuditable

  @Column({ name: 'profesional_centro_id' })
  profesionalCentroId: number;

  @Column({ name: 'dia_semana', type: 'smallint' })
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado

  @Column({ name: 'hora_desde', type: 'time' })
  horaDesde: string;

  @Column({ name: 'hora_hasta', type: 'time' })
  horaHasta: string;

  @Column({ name: 'duracion_turno', type: 'int' })
  duracionTurno: number; // minutos

  @Column({ name: 'buffer_minutos', type: 'int', default: 0 })
  bufferMinutos: number;

  @Column({ name: 'timezone', type: 'varchar', length: 50, nullable: true })
timezone: string;

  @Column({ name: 'fecha_desde', type: 'date' })
  fechaDesde: Date;

  @Column({ name: 'fecha_hasta', type: 'date', nullable: true })
  fechaHasta: Date | null;

  // Relaciones
  @ManyToOne(() => ProfesionalCentro)
  @JoinColumn({ name: 'profesional_centro_id' })
  profesionalCentro: ProfesionalCentro;
}
