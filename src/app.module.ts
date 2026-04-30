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
import { ActividadEspecialidadModule } from './actividad-especialidad/actividad-especialidad.module';
import { ProfesionalModule } from './profesional/profesional.module';
import { UploadModule } from './upload/upload.module';
import { ProfesionalEspecialidadModule } from './profesional-especialidad/profesional-especialidad.module';
import { CentroModule } from './centro/centro.module';
import { ProfesionalCentroModule } from './profesional-centro/profesional-centro.module';
import { AgendaDisponibilidadModule } from './agenda-disponibilidad/agenda-disponibilidad.module';
import { ExcepcionesFechasModule } from './excepciones-fechas/excepciones-fechas.module';
import { AgendaPublicaModule } from './agenda-publica/agenda-publica.module';  // 👈 AGREGADO

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      extra: { family: 4 },
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
    ActividadEspecialidadModule,
    ProfesionalModule,
    UploadModule,
    ProfesionalEspecialidadModule,
    CentroModule,
    ProfesionalCentroModule,
    AgendaDisponibilidadModule,
    ExcepcionesFechasModule,
    AgendaPublicaModule,  // 👈 AGREGADO
  ],
})
export class AppModule {}
