import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntityAuditable {

  @PrimaryGeneratedColumn()
  id: number;

  // ===== ALTA =====
  @CreateDateColumn({ type: 'timestamp' })
  fecha_alta: Date;

  @Column({ length: 50, nullable: true })
  usuario_alta: string;

  // ===== MODIFICACIÓN =====
  @UpdateDateColumn({ type: 'timestamp' })
  fecha_modificacion: Date;

  @Column({ length: 50, nullable: true })
  usuario_modificacion: string;

  // ===== BAJA (Soft Delete) =====
  @Column({ type: 'timestamp', nullable: true })
  fecha_baja: Date;

  @Column({ length: 50, nullable: true })
  usuario_baja: string;
}
