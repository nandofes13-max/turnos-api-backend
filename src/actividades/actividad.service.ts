// ===== FUNCIÓN PARA GENERAR CÓDIGOS DE ACTIVIDADES EXISTENTES =====
async generarCodigosParaExistentes(usuario?: string): Promise<{ actualizadas: number }> {
  const actividades = await this.actividadRepository.find();
  let contador = 0;

  for (const actividad of actividades) {
    if (!actividad.codigo) {
      const codigo = await this.generarCodigo(actividad.nombre);
      actividad.codigo = codigo;
      actividad.usuario_modificacion = usuario || 'demo';
      await this.actividadRepository.save(actividad);
      contador++;
      console.log(`✅ Generado código ${codigo} para actividad ${actividad.nombre}`);
    }
  }

  return { actualizadas: contador };
}
