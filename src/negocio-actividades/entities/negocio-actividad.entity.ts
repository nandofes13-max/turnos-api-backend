// src/negocio-actividades/entities/negocio-actividad.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Actividad } from '../../actividades/entities/actividad.entity';

@Entity('negocio_actividades')
export class NegocioActividad extends BaseEntityAuditable {
  
  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'negocio_id' })
  negocioId: number;

  @ManyToOne(() => Actividad)
  @JoinColumn({ name: 'actividad_id' })
  actividad: Actividad;

  @Column({ name: 'actividad_id' })
  actividadId: number;
}
