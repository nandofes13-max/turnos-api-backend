import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { AgendaDisponibilidad } from '../../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Entity('agenda_excepciones')
export class AgendaExcepcion extends BaseEntityAuditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidadId: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'time' })
  hora: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: string; // 'deshabilitado' | 'habilitado_extra'

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  // Relaciones
  @ManyToOne(() => AgendaDisponibilidad)
  @JoinColumn({ name: 'agenda_disponibilidad_id' })
  agendaDisponibilidad: AgendaDisponibilidad;
}
