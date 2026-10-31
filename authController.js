module.exports = ({ authService }) => ({
  login: (req, res, next) => {
    const { usuario, clave } = res.locals.body;
    const datos = authService.login(usuario, clave);
    // Regenerar el id de sesión al iniciar sesión evita "session fixation".
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.usuario = datos;
      res.json({ mensaje: 'Sesión iniciada', usuario: datos.usuario });
    });
  },
  logout: (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.status(204).end();
    });
  },
  yo: (req, res) => res.json({ usuario: req.session.usuario.usuario }),
});
