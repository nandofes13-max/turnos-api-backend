async create(createDto: CreateAgendaDisponibilidadDto, usuario?: string): Promise<AgendaDisponibilidad> {
  await this.verificarProfesionalCentroActivo(createDto.profesionalCentroId);
  await this.verificarDiaSemanaValido(createDto.diaSemana);
  await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
  await this.verificarDuracionTurnoValida(createDto.duracionTurno);
  await this.verificarBufferMinutosValido(createDto.bufferMinutos || 0);
  await this.verificarBufferValido(createDto.duracionTurno, createDto.bufferMinutos || 0);
  await this.verificarRangoHorarioNocturno(createDto.horaDesde, createDto.horaHasta);
  await this.verificarDuracionRangoValido(
    createDto.horaDesde,
    createDto.horaHasta,
    createDto.duracionTurno,
    createDto.bufferMinutos || 0,
  );
  await this.verificarFechasValidas(createDto.fechaDesde, createDto.fechaHasta || null);
  await this.verificarSolapamiento(
    createDto.profesionalCentroId,
    createDto.diaSemana,
    createDto.horaDesde,
    createDto.horaHasta,
    createDto.fechaDesde,
    createDto.fechaHasta || null,
  );

  // ============================================================
  // VALIDACIÓN DE DUPLICADO (Ajuste 1)
  // Verificar si existe un bloque ACTIVO con mismo horario y duración
  // ============================================================
  const bloqueActivoExistente = await this.repository.findOne({
    where: {
      profesionalCentroId: createDto.profesionalCentroId,
      horaDesde: createDto.horaDesde,
      horaHasta: createDto.horaHasta,
      duracionTurno: createDto.duracionTurno,
      fecha_baja: IsNull(),
    },
  });

  if (bloqueActivoExistente) {
    throw new BadRequestException('Ya existe un bloque activo con el mismo horario y duración');
  }

  // 👉 BUSCAR SI YA EXISTE UN REGISTRO ACTIVO (para actualizarlo)
  const existenteActivo = await this.repository.findOne({
    where: {
      profesionalCentroId: createDto.profesionalCentroId,
      diaSemana: createDto.diaSemana,
      horaDesde: createDto.horaDesde,
      horaHasta: createDto.horaHasta,
      duracionTurno: createDto.duracionTurno,
      fechaDesde: createDto.fechaDesde,
      fechaHasta: createDto.fechaHasta || IsNull(),
      fecha_baja: IsNull(),
    },
  });
  
  if (existenteActivo) {
    // Actualizar el registro existente
    Object.assign(existenteActivo, {
      ...createDto,
      usuario_modificacion: usuario || 'demo',
    });
    return this.repository.save(existenteActivo);
  }
  
  // BUSCAR SI EXISTE UN REGISTRO ELIMINADO (para reactivarlo)
  const existenteEliminado = await this.repository.findOne({
    where: {
      profesionalCentroId: createDto.profesionalCentroId,
      diaSemana: createDto.diaSemana,
      horaDesde: createDto.horaDesde,
      horaHasta: createDto.horaHasta,
      duracionTurno: createDto.duracionTurno,
      fechaDesde: createDto.fechaDesde,
      fechaHasta: createDto.fechaHasta || IsNull(),
      fecha_baja: Not(IsNull()),
    },
  });
  
  if (existenteEliminado) {
    existenteEliminado.fecha_baja = null!;
    existenteEliminado.usuario_baja = null!;
    existenteEliminado.usuario_modificacion = usuario || 'demo';
    Object.assign(existenteEliminado, createDto);
    return this.repository.save(existenteEliminado);
  }

  // SI NO EXISTE NINGUNO, CREAR NUEVO
  const registro = this.repository.create({
    ...createDto,
    usuario_alta: usuario || 'demo',
  });

  try {
    return await this.repository.save(registro);
  } catch (error: any) {
    if (error.code === '23P01') {
      throw new BadRequestException(
        'No se puede guardar: Este horario solapa con una agenda existente para el mismo día.'
      );
    }
    throw error;
  }
}
