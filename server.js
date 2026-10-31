const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const { randomBytes } = require('node:crypto');
const { Server } = require('socket.io');
const { createDb } = require('./db');
const { createApp } = require('./app');

const EVENTOS = ['reserva:creada', 'reserva:actualizada', 'reserva:eliminada'];

function crearServidor({ db, uploadsDir, sessionSecret }) {
  const events = new EventEmitter();
  const app = createApp({ db, events, uploadsDir, sessionSecret });
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  // Los servicios solo emiten eventos internos; aquí se retransmiten a todos los clientes conectados.
  EVENTOS.forEach((nombre) => events.on(nombre, (datos) => io.emit(nombre, datos)));
  io.on('connection', (socket) => socket.emit('bienvenida', { mensaje: 'Conectado a las notificaciones de reservas' }));

  return { httpServer, io, events };
}

module.exports = { crearServidor };

if (require.main === module) {
  const raiz = path.join(__dirname, '..');
  const dbFile = process.env.DB_PATH || path.join(raiz, 'data', 'reservas.db');
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const secreto = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  if (!process.env.SESSION_SECRET) {
    console.warn('Aviso: defina SESSION_SECRET (sin él, las sesiones se pierden al reiniciar).');
  }

  const { httpServer } = crearServidor({
    db: createDb(dbFile),
    uploadsDir: process.env.UPLOADS_DIR || path.join(raiz, 'uploads'),
    sessionSecret: secreto,
  });
  const puerto = process.env.PORT || 3000;
  httpServer.listen(puerto, () => console.log(`API lista en http://localhost:${puerto}`));
}
