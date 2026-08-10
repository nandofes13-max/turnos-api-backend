// src/whatsapp/entities/whatsapp-config.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
// 👈 IMPORTAR InstanciaWhatsapp
import { InstanciaWhatsapp } from './instancia-whatsapp.entity';

@Entity('negocio_whatsapp_config')
@Unique(['negocioId']) // Solo una configuración por negocio
@Index(['negocioId'])
@Index(['provider'])
@Index(['activo'])
export class WhatsappConfig extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  // 👈 NUEVO CAMPO: referencia a la instancia
  @Column({ name: 'instancia_id', nullable: true })
  instanciaId: number;

  @Column({ name: 'provider', type: 'varchar', length: 20, default: 'greenapi' })
  provider: string; // 'greenapi' | 'meta' (para futuro)

  // ===== GREEN API =====
  @Column({ name: 'instance_id', type: 'varchar', length: 50, nullable: true })
  instanceId: string;

  @Column({ name: 'api_token', type: 'varchar', length: 200, nullable: true })
  apiToken: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  // ===== FUTURO: META CLOUD API =====
  // @Column({ name: 'meta_waba_id', type: 'varchar', length: 100, nullable: true })
  // metaWabaId: string;
  //
  // @Column({ name: 'meta_phone_number_id', type: 'varchar', length: 100, nullable: true })
  // metaPhoneNumberId: string;

  // ===== ESTADO GENERAL =====
  @Column({ name: 'activo', type: 'boolean', default: false })
  activo: boolean;

  @Column({ name: 'estado', type: 'varchar', length: 20, nullable: true })
  estado: string; // 'pending' | 'authorized' | 'error' | 'disabled'

  @Column({ name: 'ultima_prueba', type: 'timestamp', nullable: true })
  ultimaPrueba: Date | null;

  // ===== RELACIONES =====
  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  // 👈 NUEVA RELACIÓN: ManyToOne con InstanciaWhatsapp
  @ManyToOne(() => InstanciaWhatsapp)
  @JoinColumn({ name: 'instancia_id' })
  instancia: InstanciaWhatsapp;
}
