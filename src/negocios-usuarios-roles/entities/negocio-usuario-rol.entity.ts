// src/negocios-usuarios-roles/entities/negocio-usuario-rol.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntityAuditable } from '../../entities/base.entity';
import { Negocio } from '../../negocios/entities/negocio.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Rol } from '../../roles/entities/rol.entity';

@Entity('negocios_usuarios_roles')
@Unique('unique_negocio_usuario_rol', ['negocioId', 'usuarioId', 'rolId'])  // 👈 AGREGADO
export class NegocioUsuarioRol extends BaseEntityAuditable {
  
  @ManyToOne(() => Negocio)
  @JoinColumn({ name: 'negocio_id' })
  negocio: Negocio;

  @Column({ name: 'negocio_id' })
  negocioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ name: 'rol_id' })
  rolId: number;
}
