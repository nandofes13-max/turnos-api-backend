// src/negocios/entities/negocio.entity.ts
import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity()
export class Negocio extends BaseEntityAuditable {
  
  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100, unique: true })
  url: string;

  // WhatsApp
  @Column({ type: 'int', nullable: false })
  country_code: number;

  @Column({ length: 15, nullable: false })
  national_number: string;

  @Column({ length: 16, unique: true, nullable: false })
  whatsapp_e164: string;

  // Domicilio estructurado
  @Column({ length: 120, nullable: true })
  street: string;

  @Column({ length: 20, nullable: true })
  street_number: string;

  @Column({ length: 20, nullable: true })
  postal_code: string;

  @Column({ length: 120, nullable: true })
  city: string;

  @Column({ length: 120, nullable: true })
  state: string;

  @Column({ length: 120, nullable: true })
  country: string;

  @Column({ length: 2, nullable: true })
  country_code_iso: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  formatted_address: string;

  // Getter para último movimiento
  get ultimoMovimiento(): string {
    if (this.fecha_baja && this.usuario_baja) {
      return `${this.usuario_baja} - BAJA - ${this.formatearFecha(this.fecha_baja)}`;
    } else if (this.fecha_modificacion && 
               this.fecha_alta && 
               this.fecha_modificacion.getTime() !== this.fecha_alta.getTime() && 
               this.usuario_modificacion) {
      return `${this.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFecha(this.fecha_modificacion)}`;
    } else if (this.usuario_alta) {
      return `${this.usuario_alta} - ALTA - ${this.formatearFecha(this.fecha_alta)}`;
    }
    return 'Sin información';
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  }

  // Generar whatsapp_e164 automáticamente
  @BeforeInsert()
  @BeforeUpdate()
  generarE164() {
    if (this.country_code && this.national_number) {
      const soloNumeros = this.national_number.replace(/\D/g, '');
      this.whatsapp_e164 = `+${this.country_code}${soloNumeros}`;
    }
  }
}
