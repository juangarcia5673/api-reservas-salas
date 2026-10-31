const { AppError, noEncontrado } = require('../utils/errors');
const { salaADto } = require('../utils/mapeo');

module.exports = ({ salasRepo }) => ({
  listar: () => salasRepo.listar().map(salaADto),

  obtener: (id) => {
    const fila = salasRepo.obtener(id);
    if (!fila) throw noEncontrado('Sala');
    return salaADto(fila);
  },

  crear: (datos) => {
    if (salasRepo.buscarPorNombre(datos.nombre)) {
      throw new AppError(409, 'NOMBRE_DUPLICADO', 'Ya existe una sala con ese nombre');
    }
    return salaADto(salasRepo.crear(datos));
  },

  asignarFoto: (id, rutaPublica) => {
    salasRepo.actualizarFoto(id, rutaPublica);
    return salaADto(salasRepo.obtener(id));
  },
});
