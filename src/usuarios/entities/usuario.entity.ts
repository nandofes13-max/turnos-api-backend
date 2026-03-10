// src/usuarios/entities/usuario.entity.ts
import { Entity, Column, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity()
@Unique(['email']) // Asegura que el email sea único en la BD
export class Usuario extends BaseEntityAuditable {
  
  @Column({ length: 100 })
  email: string;

  @Column({ length: 255, nullable: true }) // Puede ser null para usuarios Demo o Google
  password_hash: string;

  @Column({ length: 50 })
  apellido: string;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  // Getter para nombre completo (útil para mostrar)
  get nombreCompleto(): string {
    return `${this.apellido} ${this.nombre}`.trim();
  }

  // Getter para último movimiento (igual que en Filial)
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
