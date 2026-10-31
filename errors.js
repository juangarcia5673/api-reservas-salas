// Error de aplicación con estado HTTP y código interno estable.
class AppError extends Error {
  constructor(status, codigo, mensaje, detalles = []) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const noEncontrado = (recurso) =>
  new AppError(404, 'NO_ENCONTRADO', `${recurso} no encontrado`);

module.exports = { AppError, noEncontrado };
