// src/whatsapp/entities/whatsapp-config.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { InstanciaWhatsapp } from './instancia-whatsapp.entity';

@Entity('negocio_whatsapp_config')
@Unique(['negocioId'])
@Index(['negocioId'])
@Index(['provider'])
@Index(['activo'])
export class WhatsappConfig extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  @Column({ name: 'instancia_id', nullable: true })
  instanciaId: number;

  @Column({ name: 'provider', type: 'varchar', length: 20, default: 'greenapi' })
  provider: string;

  @Column({ name: 'instance_id', type: 'varchar', length: 50, nullable: true })
  instanceId: string;

  @Column({ name: 'api_token', type: 'varchar', length: 200, nullable: true })
  apiToken: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'acceso_whatsapp', type: 'boolean', default: false })
  accesoWhatsapp: boolean;

  @Column({ name: 'activo', type: 'boolean', default: false })
  activo: boolean;

  @Column({ name: 'estado', type: 'varchar', length: 20, nullable: true })
  estado: string;

  @Column({ name: 'ultima_prueba', type: 'timestamp', nullable: true })
  ultimaPrueba: Date | null;

  // 👈 ELIMINAR fecha_baja y usuario_baja (ya existen en BaseEntityAuditable)

  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @ManyToOne(() => InstanciaWhatsapp)
  @JoinColumn({ name: 'instancia_id' })
  instancia: InstanciaWhatsapp;
}
