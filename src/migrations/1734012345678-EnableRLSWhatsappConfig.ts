// src/migrations/1734012345678-EnableRLSWhatsappConfig.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableRLSWhatsappConfig1734012345678 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 🔹 Habilitar RLS en la tabla
        await queryRunner.query(`
            ALTER TABLE negocio_whatsapp_config ENABLE ROW LEVEL SECURITY;
        `);

        // 🔹 Crear política para que solo el backend (service_role) pueda acceder
        await queryRunner.query(`
            CREATE POLICY "Permitir acceso solo al backend" ON negocio_whatsapp_config
                FOR ALL
                TO service_role
                USING (true);
        `);

        console.log('✅ RLS habilitado y política creada en negocio_whatsapp_config');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 🔹 Eliminar la política
        await queryRunner.query(`
            DROP POLICY IF EXISTS "Permitir acceso solo al backend" ON negocio_whatsapp_config;
        `);

        // 🔹 Deshabilitar RLS
        await queryRunner.query(`
            ALTER TABLE negocio_whatsapp_config DISABLE ROW LEVEL SECURITY;
        `);

        console.log('🔄 RLS deshabilitado y política eliminada en negocio_whatsapp_config');
    }
}
