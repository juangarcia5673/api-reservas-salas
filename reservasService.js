const { AppError, noEncontrado } = require('../utils/errors');
const { haySolape } = require('../utils/tiempo');
const { reservaADto } = require('../utils/mapeo');

module.exports = ({ reservasRepo, salasRepo, events }) => {
  const exigirSala = (salaId) => {
    if (!salasRepo.obtener(salaId)) throw new AppError(404, 'NO_ENCONTRADO', 'La sala indicada no existe');
  };

  // Regla de negocio: una sala no puede tener dos reservas que se solapen.
  const verificarDisponibilidad = (candidata, excluirId = null) => {
    const choques = reservasRepo
      .listarPorSala(candidata.salaId)
      .filter((r) => r.id !== excluirId && haySolape(r, candidata));
    if (choques.length > 0) {
      throw new AppError(409, 'CONFLICTO_HORARIO', 'La sala ya está reservada en ese horario',
        choques.map((c) => ({ reservaId: c.id, inicio: c.inicio, fin: c.fin })));
    }
  };

  return {
    listar: (filtros) => reservasRepo.listar(filtros).map(reservaADto),

    obtener: (id) => {
      const fila = reservasRepo.obtener(id);
      if (!fila) throw noEncontrado('Reserva');
      return reservaADto(fila);
    },

    crear: (datos) => {
      exigirSala(datos.salaId);
      verificarDisponibilidad(datos);
      const nueva = reservaADto(reservasRepo.crear(datos));
      events.emit('reserva:creada', nueva);
      return nueva;
    },

    actualizar: (id, datos) => {
      if (!reservasRepo.obtener(id)) throw noEncontrado('Reserva');
      exigirSala(datos.salaId);
      verificarDisponibilidad(datos, id);
      if (reservasRepo.actualizar(id, datos) === 0) {
        throw new AppError(409, 'CONFLICTO_VERSION',
          'La reserva fue modificada por otra persona; recargue e intente de nuevo');
      }
      const actualizada = reservaADto(reservasRepo.obtener(id));
      events.emit('reserva:actualizada', actualizada);
      return actualizada;
    },

    eliminar: (id) => {
      const fila = reservasRepo.obtener(id);
      if (!fila) throw noEncontrado('Reserva');
      reservasRepo.eliminar(id);
      events.emit('reserva:eliminada', { id });
    },
  };
};
