import {
  acotarDb,
  clasificar,
  dbfsANivelDb,
  pcmANivelDb,
  promedioEnergetico,
  redondear,
  resumirSesion,
} from '../../src/domain/acustica';
import { ZONAS_LOCALES } from '../../src/domain/zonas';

describe('acustica (dominio medidor-app)', () => {
  it('convierte PCM float32 a nivel dB sin guardar audio', () => {
    expect(pcmANivelDb([])).toBe(25);
    expect(pcmANivelDb([0, 0, 0])).toBe(25);
    expect(pcmANivelDb([0.1, -0.1, 0.1, -0.1], 90)).toBe(70);
  });

  it('convierte dBFS a dB y acota entre piso y techo', () => {
    expect(dbfsANivelDb(-30, 90)).toBe(60);
    expect(dbfsANivelDb(Number.NaN, 90)).toBe(25);
    expect(acotarDb(5)).toBe(25);
    expect(acotarDb(200)).toBe(130);
    expect(redondear(62.345)).toBe(62.3);
  });

  it('calcula promedio energético (Leq) logarítmico', () => {
    expect(promedioEnergetico([60, 70])).toBeCloseTo(67.4, 1);
    expect(() => promedioEnergetico([])).toThrow(RangeError);
  });

  it('clasifica niveles según umbrales OMS', () => {
    expect(clasificar(38)).toBe('silencioso');
    expect(clasificar(52)).toBe('moderado');
    expect(clasificar(68)).toBe('ruidoso');
    expect(clasificar(82)).toBe('muy-ruidoso');
  });

  it('resume una sesión de medición con duración mínima de 5 s', () => {
    const r = resumirSesion('biblioteca', [40, 42, 44], 2);
    expect(r).toEqual({
      zonaId: 'biblioteca',
      leqDb: 42.3,
      minDb: 40,
      maxDb: 44,
      duracionSeg: 5,
      muestras: 3,
    });
    expect(() => resumirSesion('biblioteca', [], 10)).toThrow(RangeError);
  });

  it('incluye las zonas iniciales del campus', () => {
    expect(ZONAS_LOCALES.length).toBeGreaterThanOrEqual(6);
  });
});
