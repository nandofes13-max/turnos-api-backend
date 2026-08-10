// src/migrations/1734123456789-CreateInstanciaWhatsapp.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInstanciaWhatsapp1734123456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 🔹 Crear la tabla instancias_whatsapp
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS instancias_whatsapp (
                id SERIAL PRIMARY KEY,
                instance_id VARCHAR(50) NOT NULL,
                api_token VARCHAR(200) NOT NULL,
                numero_whatsapp VARCHAR(20),
                negocios_activos INTEGER DEFAULT 0,
                estado VARCHAR(20) DEFAULT 'disponible',
                fecha_llena TIMESTAMP NULL,
                fecha_alta TIMESTAMP DEFAULT NOW(),
                usuario_alta VARCHAR(50),
                fecha_modificacion TIMESTAMP,
                usuario_modificacion VARCHAR(50),
                fecha_baja TIMESTAMP NULL,
                usuario_baja VARCHAR(50)
            );
        `);

        // 🔹 Crear índices para mejorar el rendimiento
        await queryRunner.query(`
            CREATE INDEX idx_instancias_whatsapp_estado ON instancias_whatsapp(estado);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_instancias_whatsapp_negocios_activos ON instancias_whatsapp(negocios_activos);
        `);

        // 🔹 Habilitar RLS en la tabla
        await queryRunner.query(`
            ALTER TABLE instancias_whatsapp ENABLE ROW LEVEL SECURITY;
        `);

        // 🔹 Crear política para que solo el backend (service_role) pueda acceder
        await queryRunner.query(`
            CREATE POLICY "Permitir acceso solo al backend" ON instancias_whatsapp
                FOR ALL
                TO service_role
                USING (true);
        `);

        console.log('✅ Tabla instancias_whatsapp creada, RLS habilitado y política creada');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 🔹 Eliminar la política
        await queryRunner.query(`
            DROP POLICY IF EXISTS "Permitir acceso solo al backend" ON instancias_whatsapp;
        `);

        // 🔹 Deshabilitar RLS
        await queryRunner.query(`
            ALTER TABLE instancias_whatsapp DISABLE ROW LEVEL SECURITY;
        `);

        // 🔹 Eliminar la tabla
        await queryRunner.query(`
            DROP TABLE IF EXISTS instancias_whatsapp;
        `);

        console.log('🔄 Tabla instancias_whatsapp eliminada');
    }
}
