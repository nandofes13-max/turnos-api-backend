import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Profesional } from '../../profesional/entities/profesional.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';

@Entity('profesional_especialidad')
export class ProfesionalEspecialidad extends BaseEntityAuditable {
  @Column({ name: 'profesional_id' })
  profesionalId: number;

  @Column({ name: 'especialidad_id' })
  especialidadId: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  // Relaciones
  @ManyToOne(() => Profesional)
  @JoinColumn({ name: 'profesional_id' })
  profesional: Profesional;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;
}
