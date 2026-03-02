// src/entities/filial.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntityAuditable } from './base.entity';

@Entity()
export class Filial extends BaseEntityAuditable {
  @Column()
  codigo: string;

  @Column()
  nombre: string;
}
