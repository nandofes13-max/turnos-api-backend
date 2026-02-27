import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('filiales')
export class Filial extends BaseEntity {

  @Column({ unique: true, length: 10 })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;
}
