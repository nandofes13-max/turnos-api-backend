// src/actividad-especialidad/entities/actividad-especialidad.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Actividad } from '../../actividades/entities/actividad.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';

@Entity('actividad_especialidad')
export class ActividadEspecialidad extends BaseEntityAuditable {
  
  @ManyToOne(() => Actividad)
  @JoinColumn({ name: 'actividad_id' })
  actividad: Actividad;

  @Column({ name: 'actividad_id' })
  actividadId: number;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @Column({ name: 'especialidad_id' })
  especialidadId: number;
}
