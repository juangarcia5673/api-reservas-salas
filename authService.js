const { AppError } = require('../utils/errors');
const { verificar } = require('../utils/password');

module.exports = ({ usuariosRepo }) => ({
  // Mensaje genérico a propósito: no revela si falló el usuario o la clave.
  login: (usuario, clave) => {
    const fila = usuariosRepo.buscarPorUsuario(usuario);
    if (!fila || !verificar(clave, fila.clave_hash)) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Usuario o clave incorrectos');
    }
    return { id: fila.id, usuario: fila.usuario };
  },
});
