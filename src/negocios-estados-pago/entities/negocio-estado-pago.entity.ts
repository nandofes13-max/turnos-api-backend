import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';

@Entity('negocios_estados_pago')
@Unique(['negocioId', 'nombre'])
@Index(['negocioId'])
@Index(['requierePago'])
export class NegocioEstadoPago extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ type: 'varchar', length: 30 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'codigo_color', type: 'varchar', length: 7, default: '#000000' })
  codigoColor: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'requiere_pago', type: 'boolean', default: true })
  requierePago: boolean;

  @Column({ name: 'permite_cancelar', type: 'boolean', default: true })
  permiteCancelar: boolean;

  @Column({ name: 'disponible_slot', type: 'boolean', default: false })
  disponibleSlot: boolean;
}
