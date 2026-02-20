import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('filiales')
export class Filial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  direccion: string;

  @Column({ nullable: true })
  telefono?: string;
}
