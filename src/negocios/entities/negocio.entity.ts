// src/negocios/entities/negocio.entity.ts
import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity()
export class Negocio extends BaseEntityAuditable {
  
  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100, unique: true })
  url: string;

  // Nuevos campos de WhatsApp
  @Column({ type: 'int', nullable: false })
  country_code: number;

  @Column({ length: 15, nullable: false })
  national_number: string;

  @Column({ length: 16, unique: true, nullable: false })
  whatsapp_e164: string;

  @Column({ type: 'jsonb', nullable: true })
  domicilio: {
    calle?: string;
    numero?: string;
    codigo_postal?: string;
    localidad?: string;
    provincia?: string;
    pais?: string;
    latitud?: number;
    longitud?: number;
  };

  // Getter para último movimiento (igual que en otras entidades)
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

  // Generar whatsapp_e164 automáticamente antes de insertar/actualizar
  @BeforeInsert()
  @BeforeUpdate()
  generarE164() {
    if (this.country_code && this.national_number) {
      // Eliminar cualquier carácter no numérico del número nacional
      const soloNumeros = this.national_number.replace(/\D/g, '');
      this.whatsapp_e164 = `+${this.country_code}${soloNumeros}`;
    }
  }
}
