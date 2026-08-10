// src/whatsapp/entities/instancia-whatsapp.entity.ts
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { WhatsappConfig } from './whatsapp-config.entity';

@Entity('instancias_whatsapp')
// 👈 ÍNDICES PARA MEJORAR EL RENDIMIENTO
@Index(['estado'])
@Index(['negociosActivos'])
export class InstanciaWhatsapp extends BaseEntityAuditable {
  @Column({ name: 'instance_id', type: 'varchar', length: 50, nullable: false })
  instanceId: string;

  @Column({ name: 'api_token', type: 'varchar', length: 200, nullable: false })
  apiToken: string;

  @Column({ name: 'numero_whatsapp', type: 'varchar', length: 20, nullable: true })
  numeroWhatsapp: string;

  @Column({ name: 'negocios_activos', type: 'int', default: 0 })
  negociosActivos: number;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'disponible' })
  estado: string; // 'disponible' | 'no disponible'

  @Column({ name: 'fecha_llena', type: 'timestamp', nullable: true })
  fechaLlena: Date | null;

  // 👈 Relación con negocio_whatsapp_config (una instancia puede tener muchos negocios)
  @OneToMany(() => WhatsappConfig, (config) => config.instancia)
  configs: WhatsappConfig[];
}
