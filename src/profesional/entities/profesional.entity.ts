import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity('profesional')
export class Profesional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    unique: true,
    nullable: false 
  })
  documento: string;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    nullable: false 
  })
  nombre: string;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    unique: true,
    nullable: false 
  })
  email: string;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    nullable: false,
    name: 'whatsapp'
  })
  whatsapp: string;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    nullable: true 
  })
  matricula: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true 
  })
  foto: string;

  @CreateDateColumn({ 
    name: 'fecha_alta',
    type: 'timestamp'
  })
  fecha_alta: Date;

  @Column({ 
    name: 'usuario_alta',
    type: 'varchar', 
    length: 50, 
    nullable: false,
    default: 'demo'
  })
  usuario_alta: string;

  @UpdateDateColumn({ 
    name: 'fecha_modificacion',
    type: 'timestamp',
    nullable: true
  })
  fecha_modificacion: Date;

  @Column({ 
    name: 'usuario_modificacion',
    type: 'varchar', 
    length: 50, 
    nullable: true
  })
  usuario_modificacion: string;

  @Column({ 
    name: 'fecha_baja',
    type: 'timestamp', 
    nullable: true 
  })
  fecha_baja: Date;

  @Column({ 
    name: 'usuario_baja',
    type: 'varchar', 
    length: 50, 
    nullable: true 
  })
  usuario_baja: string;
}
