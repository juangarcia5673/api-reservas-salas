# API de Reservas de Salas

Proyecto de **Aplicaciones Web – Unidad 2 (Programación del lado del servidor)**, Universidad Politécnica Salesiana.
API REST con Node.js + Express, persistencia en SQLite, sesiones, subida de archivos y notificaciones en tiempo real (Socket.IO).

## Requisitos
- Node.js 20 o superior (el proyecto usa `better-sqlite3` 13; se recomienda Node 22).
- npm incluido con Node.js.

## Configuración de entorno
Copie `.env.example` como `.env` y configure `SESSION_SECRET` y `ADMIN_PASS` antes de ejecutar la aplicación en un entorno compartido o desplegado. El archivo `.env` está excluido del repositorio mediante `.gitignore`.

**Credenciales de demostración:** en una instalación local sin `ADMIN_PASS` configurada, el proyecto crea el usuario `admin` con clave `admin123` para facilitar las pruebas. Esas credenciales son únicamente para demostración; defina `ADMIN_PASS` antes de exponer la API en una red.

## Instalación y ejecución
```bash
npm install
npm start          # http://localhost:3000
npm test           # 35 pruebas automatizadas (Jest + Supertest + socket.io-client)
```
Variables de entorno: `PORT`, `SESSION_SECRET`, `DB_PATH`, `UPLOADS_DIR`, `ADMIN_PASS`. Consulte `.env.example`.

Usuario de demostración: **admin / admin123** (cámbielo con `ADMIN_PASS` antes de desplegar).
Abra `http://localhost:3000/` para ver las notificaciones en vivo mientras prueba la API.

## Arquitectura (capas)
```
routes → controllers → services → repositories → SQLite
              ↑            ↑
         middlewares   utils (funciones puras)
```
| Capa | Responsabilidad |
|---|---|
| `routes/` | Define URLs, métodos y middlewares de cada endpoint |
| `controllers/` | Traduce HTTP ↔ servicio (sin lógica de negocio) |
| `services/` | Reglas de negocio (choque de horarios, versiones) y emisión de eventos |
| `repositories/` | Único lugar con SQL; todas las consultas son parametrizadas |
| `utils/` | Funciones puras (`haySolape`, `normalizarFecha`, mapeos) |
| `middlewares/` | Validación (zod), autenticación, subida de archivos, manejo de errores |

## Endpoints
| Método | Ruta | Sesión | Descripción | Éxito | Errores posibles |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | No | Inicia sesión | 200 | 400, 401 |
| POST | `/api/auth/logout` | Sí | Cierra sesión | 204 | 401 |
| GET | `/api/auth/yo` | Sí | Usuario actual | 200 | 401 |
| GET | `/api/salas` | No | Lista salas | 200 | |
| GET | `/api/salas/:id` | No | Una sala | 200 | 400, 404 |
| POST | `/api/salas` | Sí | Crea sala | 201 | 400, 401, 409 |
| POST | `/api/salas/:id/foto` | Sí | Sube foto (campo `foto`, JPG/PNG, máx. 2 MB) | 201 | 400, 401, 404, 413 |
| GET | `/api/reservas?salaId=&fecha=` | No | Lista/filtra reservas | 200 | 400 |
| GET | `/api/reservas/:id` | No | Una reserva | 200 | 400, 404 |
| POST | `/api/reservas` | Sí | Crea reserva | 201 | 400, 401, 404, 409 |
| PUT | `/api/reservas/:id` | Sí | Actualiza (requiere `version`) | 200 | 400, 401, 404, 409 |
| DELETE | `/api/reservas/:id` | Sí | Elimina | 204 | 400, 401, 404 |

### Formato uniforme de errores
```json
{ "error": { "codigo": "CONFLICTO_HORARIO", "mensaje": "La sala ya está reservada en ese horario", "detalles": [] } }
```
Códigos: `VALIDACION`, `JSON_INVALIDO`, `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS`, `NO_ENCONTRADO`, `RUTA_NO_ENCONTRADA`, `CONFLICTO_HORARIO`, `CONFLICTO_VERSION`, `NOMBRE_DUPLICADO`, `ARCHIVO_INVALIDO`, `CUERPO_DEMASIADO_GRANDE`, `ERROR_INTERNO`.

## Ejemplos (curl)
```bash
# 1. Iniciar sesión (guarda la cookie)
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"usuario":"admin","clave":"admin123"}' http://localhost:3000/api/auth/login

# 2. Crear reserva  -> 201
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"salaId":1,"responsable":"Ana Pérez","motivo":"Clase de refuerzo","inicio":"2026-11-02T10:00:00Z","fin":"2026-11-02T12:00:00Z"}' \
  http://localhost:3000/api/reservas
# {"id":1,"salaId":1,"responsable":"Ana Pérez","motivo":"Clase de refuerzo","inicio":"2026-11-02T10:00:00.000Z","fin":"2026-11-02T12:00:00.000Z","version":1}

# 3. Reserva que choca -> 409
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"salaId":1,"responsable":"Luis Mora","inicio":"2026-11-02T11:00:00Z","fin":"2026-11-02T13:00:00Z"}' \
  http://localhost:3000/api/reservas
# {"error":{"codigo":"CONFLICTO_HORARIO","mensaje":"La sala ya está reservada en ese horario","detalles":[{"reservaId":1,"inicio":"2026-11-02T10:00:00.000Z","fin":"2026-11-02T12:00:00.000Z"}]}}

# 4. Datos inválidos -> 400
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"salaId":1,"responsable":"A","inicio":"hoy","fin":"2026-11-02T13:00:00Z"}' http://localhost:3000/api/reservas
# {"error":{"codigo":"VALIDACION","mensaje":"Datos de entrada inválidos","detalles":[{"campo":"responsable","mensaje":"Mínimo 2 caracteres"},{"campo":"inicio","mensaje":"Fecha inválida, use ISO 8601 (ej. 2026-11-02T10:00:00Z)"}]}}

# 5. Subir foto de una sala -> 201
curl -b cookies.txt -F "foto=@sala.png;type=image/png" http://localhost:3000/api/salas/1/foto
```

## Eventos en tiempo real (Socket.IO)
El servidor emite a todos los clientes: `reserva:creada` (reserva completa), `reserva:actualizada` (reserva completa) y `reserva:eliminada` (`{ "id": n }`).
```js
const socket = io('http://localhost:3000');
socket.on('reserva:creada', (r) => console.log('Nueva reserva', r));
```

## Decisiones de seguridad
- Consultas SQL siempre parametrizadas (nunca se concatenan datos del usuario).
- Validación estricta con zod (rechaza campos desconocidos y tipos incorrectos).
- Claves guardadas con scrypt + sal; cookie de sesión `httpOnly` + `sameSite`; el id de sesión se regenera al iniciar sesión.
- Subida de archivos: lista blanca de tipos, límite de 2 MB, nombre generado por el servidor y verificación de los primeros bytes del archivo.
- Concurrencia optimista (`version`) para evitar que una edición pise a otra.

## Limitaciones conocidas
- Las sesiones usan el almacén en memoria de `express-session` (suficiente para la demostración; en producción se usaría Redis o similar).
- Los datos de SQLite y las fotos en el plan gratuito de algunos hostings no persisten entre despliegues.
