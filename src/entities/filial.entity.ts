import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Filial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo: string;

  @Column()
  nombre: string;
}
