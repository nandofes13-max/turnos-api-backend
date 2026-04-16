import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { ProfesionalCentroEspecialidad } from '../../profesional-centro/entities/profesional-centro-especialidad.entity';

@Entity('excepciones_recurrentes')
export class ExcepcionRecurrente extends BaseEntityAuditable {
  // ❌ ELIMINAR: @PrimaryGeneratedColumn() id: number;

  @Column({ name: 'profesional_centro_especialidad_id' })
  profesionalCentroEspecialidadId: number;

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

  @ManyToOne(() => ProfesionalCentroEspecialidad)
  @JoinColumn({ name: 'profesional_centro_especialidad_id' })
  profesionalCentroEspecialidad: ProfesionalCentroEspecialidad;
}
