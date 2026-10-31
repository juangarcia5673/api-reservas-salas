const { AppError } = require('../utils/errors');

// Valida body, params o query con un esquema zod y deja el resultado limpio en res.locals[origen].
const validar = (esquema, origen = 'body') => (req, res, next) => {
  const resultado = esquema.safeParse(req[origen]);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
    return next(new AppError(400, 'VALIDACION', 'Datos de entrada inválidos', detalles));
  }
  res.locals[origen] = resultado.data;
  next();
};

module.exports = { validar };
