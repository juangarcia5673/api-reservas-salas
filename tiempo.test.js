const { haySolape, normalizarFecha } = require('../src/utils/tiempo');

const r = (inicio, fin) => ({ inicio, fin });

describe('haySolape (función pura)', () => {
  test('detecta solape parcial', () => {
    expect(haySolape(r('2026-11-02T10:00:00.000Z', '2026-11-02T12:00:00.000Z'),
                     r('2026-11-02T11:00:00.000Z', '2026-11-02T13:00:00.000Z'))).toBe(true);
  });
  test('detecta un intervalo contenido en otro', () => {
    expect(haySolape(r('2026-11-02T10:00:00.000Z', '2026-11-02T14:00:00.000Z'),
                     r('2026-11-02T11:00:00.000Z', '2026-11-02T12:00:00.000Z'))).toBe(true);
  });
  test('reservas consecutivas (borde exacto) NO chocan', () => {
    expect(haySolape(r('2026-11-02T10:00:00.000Z', '2026-11-02T11:00:00.000Z'),
                     r('2026-11-02T11:00:00.000Z', '2026-11-02T12:00:00.000Z'))).toBe(false);
  });
  test('intervalos separados no chocan', () => {
    expect(haySolape(r('2026-11-02T08:00:00.000Z', '2026-11-02T09:00:00.000Z'),
                     r('2026-11-02T11:00:00.000Z', '2026-11-02T12:00:00.000Z'))).toBe(false);
  });
});

describe('normalizarFecha', () => {
  test('convierte cualquier offset a UTC', () => {
    expect(normalizarFecha('2026-11-02T10:00:00-05:00')).toBe('2026-11-02T15:00:00.000Z');
  });
});
