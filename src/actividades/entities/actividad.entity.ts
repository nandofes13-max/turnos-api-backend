import { Entity, Column } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity()
export class Actividad extends BaseEntityAuditable {
  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ default: false })
  virtual: boolean;

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
}
