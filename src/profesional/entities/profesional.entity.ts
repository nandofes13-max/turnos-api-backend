import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';

@Entity('profesional')
export class Profesional extends BaseEntityAuditable {
  @Column({ type: 'varchar', length: 20, unique: true, nullable: false })
  documento: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email: string;

  // WhatsApp (igual que Negocios)
  @Column({ type: 'int', nullable: false })
  country_code: number;

  @Column({ length: 15, nullable: false })
  national_number: string;

  @Column({ length: 16, unique: true, nullable: false })
  whatsapp_e164: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  matricula: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  foto: string;

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

  // Generar whatsapp_e164 automáticamente (igual que Negocios)
  @BeforeInsert()
  @BeforeUpdate()
  generarE164() {
    if (this.country_code && this.national_number) {
      const soloNumeros = this.national_number.replace(/\D/g, '');
      this.whatsapp_e164 = `+${this.country_code}${soloNumeros}`;
    }
  }
}
