import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { AgendaDisponibilidad } from '../../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Entity('excepciones_recurrentes')
export class ExcepcionRecurrente extends BaseEntityAuditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidadId: number;

  @Column({ name: 'dia_semana', type: 'smallint' })
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado

  @Column({ name: 'hora_desde', type: 'time' })
  horaDesde: string;

  @Column({ name: 'hora_hasta', type: 'time' })
  horaHasta: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: string; // 'deshabilitado' | 'habilitado_extra'

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  // Relaciones
  @ManyToOne(() => AgendaDisponibilidad)
  @JoinColumn({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidad: AgendaDisponibilidad;
}
