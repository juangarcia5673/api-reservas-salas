const path = require('node:path');
const express = require('express');
const session = require('express-session');

const salasRepo = require('./repositories/salasRepo');
const reservasRepo = require('./repositories/reservasRepo');
const usuariosRepo = require('./repositories/usuariosRepo');
const crearReservasService = require('./services/reservasService');
const crearSalasService = require('./services/salasService');
const crearAuthService = require('./services/authService');
const crearReservasController = require('./controllers/reservasController');
const crearSalasController = require('./controllers/salasController');
const crearAuthController = require('./controllers/authController');
const crearRutas = require('./routes');
const { crearSubida } = require('./middlewares/subida');
const { noEncontrada, manejarErrores } = require('./middlewares/errorHandler');

function createApp({ db, events, uploadsDir, sessionSecret }) {
  // Inyección de dependencias: repos -> servicios -> controladores -> rutas
  const repos = { salasRepo: salasRepo(db), reservasRepo: reservasRepo(db), usuariosRepo: usuariosRepo(db) };
  const reservasService = crearReservasService({ ...repos, events });
  const salasService = crearSalasService(repos);
  const authService = crearAuthService(repos);

  const app = express();
  const produccion = process.env.NODE_ENV === 'production';
  if (produccion) app.set('trust proxy', 1); // necesario tras el proxy de Render/Railway para cookies "secure"

  app.use(express.json({ limit: '100kb' }));
  app.use(session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: produccion, maxAge: 2 * 60 * 60 * 1000 },
  }));

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api', crearRutas({
    reservasController: crearReservasController({ reservasService }),
    salasController: crearSalasController({ salasService }),
    authController: crearAuthController({ authService }),
    subida: crearSubida(uploadsDir),
  }));

  app.use(noEncontrada);
  app.use(manejarErrores);
  return app;
}

module.exports = { createApp };
