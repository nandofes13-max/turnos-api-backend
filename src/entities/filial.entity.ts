// src/filiales/entities/filial.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntityAuditable } from './base.entity';

@Entity()
export class Filial extends BaseEntityAuditable {
  @Column()
  codigo: string;

  @Column()
  nombre: string;

  // Getter para último movimiento (no se persiste en BD)
  get ultimoMovimiento(): string {
    // Si tiene fecha de baja, es un registro eliminado
    if (this.fecha_baja && this.usuario_baja) {
      return `${this.usuario_baja} - BAJA - ${this.formatearFecha(this.fecha_baja)}`;
    }
    // Si tiene fecha de modificación distinta a la de alta, fue modificado
    else if (this.fecha_modificacion && 
             this.fecha_alta && 
             this.fecha_modificacion.getTime() !== this.fecha_alta.getTime() && 
             this.usuario_modificacion) {
      return `${this.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFecha(this.fecha_modificacion)}`;
    }
    // Si no, es un alta
    else if (this.usuario_alta) {
      return `${this.usuario_alta} - ALTA - ${this.formatearFecha(this.fecha_alta)}`;
    }
    // Fallback
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
