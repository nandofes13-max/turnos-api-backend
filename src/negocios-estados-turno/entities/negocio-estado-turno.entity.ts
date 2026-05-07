import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Centro } from '../../centro/entities/centro.entity';
import { Especialidad } from '../../especialidades/entities/especialidad.entity';

@Entity('negocios_estados_turno')
@Unique(['negocioId', 'centroId', 'especialidadId', 'nombre'])
@Index(['negocioId'])
@Index(['centroId'])
@Index(['especialidadId'])
@Index(['disponibleSlot'])
export class NegocioEstadoTurno extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'centro_id', nullable: true })
  centroId: number | null;

  @ManyToOne(() => Centro)
  @JoinColumn({ name: 'centro_id' })
  centro: Centro | null;

  @Column({ name: 'especialidad_id', nullable: true })
  especialidadId: number | null;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad | null;

  @Column({ type: 'varchar', length: 30 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'codigo_color', type: 'varchar', length: 7, default: '#000000' })
  codigoColor: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'disponible_slot', type: 'boolean', default: true })
  disponibleSlot: boolean;

  @Column({ name: 'disponible_reserva', type: 'boolean', default: true })
  disponibleReserva: boolean;
}
