import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';

@Entity('centro')
export class Centro extends BaseEntityAuditable {
  @Column({ name: 'negocio_id' })
  negocioId: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 20, unique: true })
  codigo: string;

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

  // Relaciones
  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

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

  @BeforeInsert()
  @BeforeUpdate()
  generarE164() {
    if (this.country_code && this.national_number) {
      const soloNumeros = this.national_number.replace(/\D/g, '');
      this.whatsapp_e164 = `+${this.country_code}${soloNumeros}`;
    }
  }
}
