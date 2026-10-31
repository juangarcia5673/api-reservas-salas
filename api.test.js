const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)]);
const reserva = (extra = {}) => ({
  salaId: 1, responsable: 'Ana Pérez', motivo: 'Clase de refuerzo',
  inicio: '2026-11-02T10:00:00Z', fin: '2026-11-02T12:00:00Z', ...extra,
});

let app, agent, events, uploadsDir;

beforeEach(async () => {
  events = new EventEmitter();
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
  app = createApp({ db: createDb(':memory:'), events, uploadsDir, sessionSecret: 'secreto-de-prueba' });
  agent = request.agent(app); // conserva la cookie de sesión entre peticiones
  await agent.post('/api/auth/login').send({ usuario: 'admin', clave: 'admin123' }).expect(200);
});

describe('Autenticación y sesiones', () => {
  test('login con credenciales incorrectas -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ usuario: 'admin', clave: 'mala' });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });
  test('/auth/yo devuelve el usuario con sesión activa', async () => {
    const res = await agent.get('/api/auth/yo').expect(200);
    expect(res.body.usuario).toBe('admin');
  });
  test('logout destruye la sesión', async () => {
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/yo').expect(401);
  });
  test('crear reserva sin sesión -> 401', async () => {
    const res = await request(app).post('/api/reservas').send(reserva());
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });
});

describe('CRUD de reservas', () => {
  test('POST crea (201), emite evento y GET lo recupera', async () => {
    const emitido = jest.fn();
    events.on('reserva:creada', emitido);
    const res = await agent.post('/api/reservas').send(reserva()).expect(201);
    expect(res.body).toMatchObject({ id: 1, salaId: 1, responsable: 'Ana Pérez', version: 1 });
    expect(emitido).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    const leida = await request(app).get('/api/reservas/1').expect(200);
    expect(leida.body.inicio).toBe('2026-11-02T10:00:00.000Z');
  });

  test('GET lista y filtra por sala y fecha', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.post('/api/reservas').send(reserva({ salaId: 2 })).expect(201);
    expect((await request(app).get('/api/reservas')).body).toHaveLength(2);
    expect((await request(app).get('/api/reservas?salaId=2')).body).toHaveLength(1);
    expect((await request(app).get('/api/reservas?fecha=2026-11-03')).body).toHaveLength(0);
  });

  test('PUT actualiza e incrementa la versión', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    const res = await agent.put('/api/reservas/1')
      .send({ ...reserva({ responsable: 'Luis Mora' }), version: 1 }).expect(200);
    expect(res.body).toMatchObject({ responsable: 'Luis Mora', version: 2 });
  });

  test('DELETE elimina (204) y luego GET -> 404', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.delete('/api/reservas/1').expect(204);
    const res = await request(app).get('/api/reservas/1');
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});

describe('Validación y formato uniforme de errores', () => {
  test('datos inválidos -> 400 con detalles por campo', async () => {
    const res = await agent.post('/api/reservas').send({ salaId: 'uno', responsable: 'A', inicio: 'hoy' });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
    expect(res.body.error.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(['salaId', 'responsable', 'inicio', 'fin']));
  });
  test('fin anterior a inicio -> 400', async () => {
    const res = await agent.post('/api/reservas').send(reserva({ inicio: '2026-11-02T12:00:00Z', fin: '2026-11-02T10:00:00Z' }));
    expect(res.status).toBe(400);
    expect(res.body.error.detalles[0].campo).toBe('fin');
  });
  test('campos desconocidos son rechazados', async () => {
    const res = await agent.post('/api/reservas').send(reserva({ admin: true }));
    expect(res.status).toBe(400);
  });
  test('sala inexistente -> 404', async () => {
    const res = await agent.post('/api/reservas').send(reserva({ salaId: 999 }));
    expect(res.status).toBe(404);
  });
  test('JSON malformado -> 400 JSON_INVALIDO', async () => {
    const res = await agent.post('/api/reservas').set('Content-Type', 'application/json').send('{"salaId": ');
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('JSON_INVALIDO');
  });
  test('id no numérico -> 400', async () => {
    expect((await request(app).get('/api/reservas/abc')).status).toBe(400);
  });
  test('ruta inexistente -> 404 con el mismo formato', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('RUTA_NO_ENCONTRADA');
  });
  test('intento de inyección SQL en el filtro es rechazado', async () => {
    const res = await request(app).get('/api/reservas').query({ salaId: '1 OR 1=1' });
    expect(res.status).toBe(400);
  });
  test('un texto con comillas SQL se guarda como dato, sin romper nada', async () => {
    const res = await agent.post('/api/reservas').send(reserva({ responsable: "Robert'); DROP TABLE reservas;--" })).expect(201);
    expect(res.body.responsable).toContain('DROP TABLE');
    expect((await request(app).get('/api/reservas')).body).toHaveLength(1);
  });
});

describe('Manejo de conflictos', () => {
  test('horario solapado -> 409 CONFLICTO_HORARIO', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    const res = await agent.post('/api/reservas')
      .send(reserva({ responsable: 'Otro', inicio: '2026-11-02T11:00:00Z', fin: '2026-11-02T13:00:00Z' }));
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICTO_HORARIO');
    expect(res.body.error.detalles[0].reservaId).toBe(1);
  });
  test('reserva inmediatamente después SÍ se permite', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.post('/api/reservas')
      .send(reserva({ inicio: '2026-11-02T12:00:00Z', fin: '2026-11-02T13:00:00Z' })).expect(201);
  });
  test('misma hora en otra sala SÍ se permite', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.post('/api/reservas').send(reserva({ salaId: 2 })).expect(201);
  });
  test('PUT con versión desactualizada -> 409 CONFLICTO_VERSION', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.put('/api/reservas/1').send({ ...reserva({ motivo: 'cambio A' }), version: 1 }).expect(200);
    const res = await agent.put('/api/reservas/1').send({ ...reserva({ motivo: 'cambio B' }), version: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICTO_VERSION');
  });
  test('editar una reserva sin chocar consigo misma', async () => {
    await agent.post('/api/reservas').send(reserva()).expect(201);
    await agent.put('/api/reservas/1')
      .send({ ...reserva({ fin: '2026-11-02T12:30:00Z' }), version: 1 }).expect(200);
  });
});

describe('Salas y subida de archivos', () => {
  test('crear sala y detectar nombre duplicado', async () => {
    await agent.post('/api/salas').send({ nombre: 'Auditorio', capacidad: 120 }).expect(201);
    const res = await agent.post('/api/salas').send({ nombre: 'Auditorio', capacidad: 50 });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('NOMBRE_DUPLICADO');
  });
  test('subir una imagen PNG válida guarda el archivo y actualiza la sala', async () => {
    const res = await agent.post('/api/salas/1/foto').attach('foto', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.foto).toMatch(/^\/uploads\/sala-1-\d+\.png$/);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(1);
    await request(app).get(res.body.foto).expect(200);
  });
  test('un tipo no permitido se rechaza', async () => {
    const res = await agent.post('/api/salas/1/foto').attach('foto', Buffer.from('hola'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('ARCHIVO_INVALIDO');
  });
  test('un archivo que dice ser PNG pero no lo es se rechaza y se borra', async () => {
    const res = await agent.post('/api/salas/1/foto').attach('foto', Buffer.from('esto no es una imagen'), { filename: 'falso.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });
  test('un archivo mayor a 2 MB -> 413', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
    const res = await agent.post('/api/salas/1/foto').attach('foto', grande, { filename: 'g.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
  });
  test('subir foto sin sesión -> 401', async () => {
    const res = await request(app).post('/api/salas/1/foto').attach('foto', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
  test('subir foto a sala inexistente -> 404 y no queda archivo', async () => {
    const res = await agent.post('/api/salas/99/foto').attach('foto', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(404);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });
});
