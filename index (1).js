const { Router } = require('express');
const s = require('../schemas');
const { validar } = require('../middlewares/validar');
const { requiereSesion } = require('../middlewares/auth');

module.exports = ({ reservasController: rc, salasController: sc, authController: ac, subida }) => {
  const api = Router();

  api.get('/salud', (_req, res) => res.json({ estado: 'ok' }));

  // Autenticación (sesiones)
  api.post('/auth/login', validar(s.login), ac.login);
  api.post('/auth/logout', requiereSesion, ac.logout);
  api.get('/auth/yo', requiereSesion, ac.yo);

  // Salas
  api.get('/salas', sc.listar);
  api.get('/salas/:id', validar(s.idParam, 'params'), sc.obtener);
  api.post('/salas', requiereSesion, validar(s.crearSala), sc.crear);
  api.post('/salas/:id/foto', requiereSesion, validar(s.idParam, 'params'), sc.verificarExiste, subida, sc.subirFoto);

  // Reservas (CRUD)
  api.get('/reservas', validar(s.filtroReservas, 'query'), rc.listar);
  api.get('/reservas/:id', validar(s.idParam, 'params'), rc.obtener);
  api.post('/reservas', requiereSesion, validar(s.crearReserva), rc.crear);
  api.put('/reservas/:id', requiereSesion, validar(s.idParam, 'params'), validar(s.actualizarReserva), rc.actualizar);
  api.delete('/reservas/:id', requiereSesion, validar(s.idParam, 'params'), rc.eliminar);

  return api;
};
