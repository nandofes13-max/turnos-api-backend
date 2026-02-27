import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_alta: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_baja: Date;

  @Column({ length: 50, nullable: true })
  usuario_creacion: string;

  @UpdateDateColumn({ type: 'timestamp' })
  ultima_modificacion: Date;
}
