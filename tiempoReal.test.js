const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { io: conectar } = require('socket.io-client');
const { createDb } = require('../src/db');
const { crearServidor } = require('../src/server');

test('Socket.IO notifica reserva:creada y reserva:eliminada a los clientes conectados', async () => {
  const { httpServer, io } = crearServidor({
    db: createDb(':memory:'),
    uploadsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-')),
    sessionSecret: 'secreto-de-prueba',
  });
  await new Promise((r) => httpServer.listen(0, r));
  const url = `http://localhost:${httpServer.address().port}`;

  const socket = conectar(url);
  await new Promise((r) => socket.on('connect', r));
  const creada = new Promise((r) => socket.on('reserva:creada', r));
  const eliminada = new Promise((r) => socket.on('reserva:eliminada', r));

  const agente = request.agent(url);
  await agente.post('/api/auth/login').send({ usuario: 'admin', clave: 'admin123' }).expect(200);
  await agente.post('/api/reservas').send({
    salaId: 1, responsable: 'Ana Pérez', inicio: '2026-11-02T10:00:00Z', fin: '2026-11-02T11:00:00Z',
  }).expect(201);

  expect((await creada).responsable).toBe('Ana Pérez');

  await agente.delete('/api/reservas/1').expect(204);
  expect(await eliminada).toEqual({ id: 1 });

  socket.close();
  io.close();
});
