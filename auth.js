const { AppError } = require('../utils/errors');

const requiereSesion = (req, _res, next) => {
  if (!req.session.usuario) {
    return next(new AppError(401, 'NO_AUTENTICADO', 'Debe iniciar sesión para realizar esta acción'));
  }
  next();
};

module.exports = { requiereSesion };
