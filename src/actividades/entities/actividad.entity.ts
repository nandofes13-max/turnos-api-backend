// src/actividades/entities/actividad.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';

@Entity()
export class Actividad extends BaseEntityAuditable {
  @Column()
  nombre: string;

  // 👇 NUEVO: relación con Negocio
  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'negocio_id' })
  negocioId: number;

  // Getter para último movimiento (igual que antes)
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
