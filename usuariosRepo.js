module.exports = (db) => ({
  buscarPorUsuario: (usuario) => db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario),
});
