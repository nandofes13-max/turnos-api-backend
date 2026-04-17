// src/excepciones-fechas/entities/excepcion-fecha.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { ProfesionalCentro } from '../../profesional-centro/entities/profesional-centro.entity';

@Entity('excepciones_fechas')
export class ExcepcionFecha extends BaseEntityAuditable {
  @Column({ name: 'profesional_centro_id' })
  profesionalCentroId: number;

  @Column({ name: 'fecha_desde', type: 'date' })
  fechaDesde: Date;

  @Column({ name: 'fecha_hasta', type: 'date', nullable: true })
  fechaHasta: Date | null;

  @Column({ name: 'hora_desde', type: 'time', nullable: true })
  horaDesde: string | null;

  @Column({ name: 'hora_hasta', type: 'time', nullable: true })
  horaHasta: string | null;

  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @ManyToOne(() => ProfesionalCentro)
  @JoinColumn({ name: 'profesional_centro_id' })
  profesionalCentro: ProfesionalCentro;
}
