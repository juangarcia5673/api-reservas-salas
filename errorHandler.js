const multer = require('multer');
const { AppError } = require('../utils/errors');

const noEncontrada = (req, _res, next) =>
  next(new AppError(404, 'RUTA_NO_ENCONTRADA', `No existe ${req.method} ${req.originalUrl}`));

// Un solo lugar donde TODOS los errores se convierten al mismo formato JSON.
// eslint-disable-next-line no-unused-vars
const manejarErrores = (err, _req, res, _next) => {
  let e = err;
  if (!(err instanceof AppError)) {
    if (err.type === 'entity.parse.failed') {
      e = new AppError(400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido');
    } else if (err.type === 'entity.too.large') {
      e = new AppError(413, 'CUERPO_DEMASIADO_GRANDE', 'El cuerpo de la petición es demasiado grande');
    } else if (err instanceof multer.MulterError) {
      const grande = err.code === 'LIMIT_FILE_SIZE';
      e = new AppError(grande ? 413 : 400, 'ARCHIVO_INVALIDO',
        grande ? 'El archivo supera el máximo de 2 MB' : 'No se pudo procesar el archivo');
    } else {
      console.error(err);
      e = new AppError(500, 'ERROR_INTERNO', 'Error interno del servidor');
    }
  }
  res.status(e.status).json({ error: { codigo: e.codigo, mensaje: e.message, detalles: e.detalles } });
};

module.exports = { noEncontrada, manejarErrores };
