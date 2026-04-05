import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Profesional } from '../../profesional/entities/profesional.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';
import { Centro } from '../../centro/entities/centro.entity';

@Entity('profesional_centro')
@Unique(['profesionalId', 'especialidadId', 'centroId'])
export class ProfesionalCentro extends BaseEntityAuditable {
  @Column({ name: 'profesional_id' })
  profesionalId: number;

  @Column({ name: 'especialidad_id' })
  especialidadId: number;

  @Column({ name: 'centro_id' })
  centroId: number;

  // Relaciones
  @ManyToOne(() => Profesional)
  @JoinColumn({ name: 'profesional_id' })
  profesional: Profesional;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @ManyToOne(() => Centro)
  @JoinColumn({ name: 'centro_id' })
  centro: Centro;
}
