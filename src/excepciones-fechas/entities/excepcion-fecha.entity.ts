import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { ProfesionalCentroEspecialidad } from '../../profesional-centro/entities/profesional-centro-especialidad.entity';

@Entity('excepciones_fechas')
export class ExcepcionFecha extends BaseEntityAuditable {
  // ❌ ELIMINAR: @PrimaryGeneratedColumn() id: number; (ya está en BaseEntityAuditable)

  @Column({ name: 'profesional_centro_especialidad_id' })
  profesionalCentroEspecialidadId: number;

  @Column({ name: 'fecha_desde', type: 'date' })
  fechaDesde: Date;

  @Column({ name: 'fecha_hasta', type: 'date', nullable: true })
  fechaHasta: Date | null;

  @Column({ name: 'hora_desde', type: 'time', nullable: true })
  horaDesde: string | null;

  @Column({ name: 'hora_hasta', type: 'time', nullable: true })
  horaHasta: string | null;

  @Column({ type: 'varchar', length: 20 })
  tipo: string; // 'deshabilitado' | 'bloqueado'

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @ManyToOne(() => ProfesionalCentroEspecialidad)
  @JoinColumn({ name: 'profesional_centro_especialidad_id' })
  profesionalCentroEspecialidad: ProfesionalCentroEspecialidad;
}
