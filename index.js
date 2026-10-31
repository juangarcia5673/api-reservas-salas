const { z } = require('zod');
const { normalizarFecha } = require('../utils/tiempo');

const fecha = z
  .string({ required_error: 'Es obligatoria' })
  .datetime({ offset: true, message: 'Fecha inválida, use ISO 8601 (ej. 2026-11-02T10:00:00Z)' })
  .transform(normalizarFecha);

const reservaBase = z.object({
  salaId: z.number({ required_error: 'Es obligatorio', invalid_type_error: 'Debe ser un número' }).int().positive(),
  responsable: z.string({ required_error: 'Es obligatorio' }).trim().min(2, 'Mínimo 2 caracteres').max(80),
  motivo: z.string().trim().max(200).optional().default(''),
  inicio: fecha,
  fin: fecha,
}).strict();

const rangoValido = (esquema) =>
  esquema.refine((d) => d.fin > d.inicio, { message: 'fin debe ser posterior a inicio', path: ['fin'] });

const crearReserva = rangoValido(reservaBase);
const actualizarReserva = rangoValido(reservaBase.extend({ version: z.number().int().positive() }));

const filtroReservas = z.object({
  salaId: z.coerce.number().int().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato AAAA-MM-DD').optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive('El id debe ser un entero positivo') });

const crearSala = z.object({
  nombre: z.string({ required_error: 'Es obligatorio' }).trim().min(2).max(60),
  capacidad: z.number({ required_error: 'Es obligatorio' }).int().positive().max(1000),
}).strict();

const login = z.object({
  usuario: z.string({ required_error: 'Es obligatorio' }).min(1),
  clave: z.string({ required_error: 'Es obligatoria' }).min(1),
}).strict();

module.exports = { crearReserva, actualizarReserva, filtroReservas, idParam, crearSala, login };
