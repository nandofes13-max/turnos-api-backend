// ENDPOINT TEMPORAL: Generar códigos para actividades existentes
@Post('generar-codigos')
async generarCodigos(): Promise<any> {
  const resultado = await this.service.generarCodigosParaExistentes('demo');
  return { 
    message: `Se generaron ${resultado.actualizadas} códigos`,
    ...resultado 
  };
}
