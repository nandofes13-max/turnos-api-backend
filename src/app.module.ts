// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilialModule } from './filial/filial.module';
import { ActividadModule } from './actividades/actividad.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { NegociosModule } from './negocios/negocios.module';
import { NegociosUsuariosRolesModule } from './negocios-usuarios-roles/negocios-usuarios-roles.module';
import { NegocioActividadesModule } from './negocio-actividades/negocio-actividades.module';
import { EspecialidadesModule } from './especialidades/especialidades.module';
import { ActividadEspecialidadModule } from './actividad-especialidad/actividad-especialidad.module'; // 👈 AGREGADO

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        family: 4,
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
    }),
    FilialModule,
    ActividadModule,
    UsuariosModule,
    RolesModule,
    NegociosModule,
    NegociosUsuariosRolesModule,
    NegocioActividadesModule,
    EspecialidadesModule,
    ActividadEspecialidadModule, // 👈 AGREGADO
  ],
})
export class AppModule {}
