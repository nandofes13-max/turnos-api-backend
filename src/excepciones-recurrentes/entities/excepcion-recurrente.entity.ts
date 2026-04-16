import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { AgendaDisponibilidad } from '../../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Entity('excepciones_recurrentes')
export class ExcepcionRecurrente extends BaseEntityAuditable {
  @Column({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidadId: number;

  @Column({ name: 'dia_semana', type: 'smallint' })
  diaSemana: number;

  @Column({ name: 'hora_desde', type: 'time' })
  horaDesde: string;

  @Column({ name: 'hora_hasta', type: 'time' })
  horaHasta: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @ManyToOne(() => AgendaDisponibilidad)
  @JoinColumn({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidad: AgendaDisponibilidad;
}
