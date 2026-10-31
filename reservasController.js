module.exports = ({ reservasService }) => ({
  listar: (_req, res) => res.json(reservasService.listar(res.locals.query)),
  obtener: (_req, res) => res.json(reservasService.obtener(res.locals.params.id)),
  crear: (_req, res) => res.status(201).json(reservasService.crear(res.locals.body)),
  actualizar: (_req, res) => res.json(reservasService.actualizar(res.locals.params.id, res.locals.body)),
  eliminar: (_req, res) => {
    reservasService.eliminar(res.locals.params.id);
    res.status(204).end();
  },
});
