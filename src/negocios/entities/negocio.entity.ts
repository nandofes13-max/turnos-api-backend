// src/negocios/entities/negocio.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity()
export class Negocio extends BaseEntityAuditable {
  
  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100, unique: true })
  url: string;

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

  @Column({ length: 20, nullable: true })
  whatsapp: string;

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
}
