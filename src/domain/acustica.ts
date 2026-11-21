import type { Categoria, NuevaMedicion } from './tipos';

export const CALIBRACION_POR_DEFECTO_DB = 90;
const PISO_DB = 25;
const TECHO_DB = 130;

export const UMBRALES: readonly { hasta: number; categoria: Categoria }[] = [
  { hasta: 45, categoria: 'silencioso' },
  { hasta: 60, categoria: 'moderado' },
  { hasta: 75, categoria: 'ruidoso' },
];

export function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function acotarDb(nivelDb: number): number {
  return Math.min(TECHO_DB, Math.max(PISO_DB, nivelDb));
}

/**
 * Convierte un buffer PCM float32 (-1..1) en un único número en dB y descarta las muestras.
 * No guarda ni copia el buffer: de aquí solo sale un escalar.
 */
export function pcmANivelDb(
  muestrasPcm: ArrayLike<number>,
  calibracionDb = CALIBRACION_POR_DEFECTO_DB,
): number {
  if (muestrasPcm.length === 0) return PISO_DB;
  let sumaCuadrados = 0;
  for (let i = 0; i < muestrasPcm.length; i += 1) {
    const m = muestrasPcm[i] ?? 0;
    sumaCuadrados += m * m;
  }
  const rms = Math.sqrt(sumaCuadrados / muestrasPcm.length);
  if (rms <= 1e-7) return PISO_DB;
  const dbfs = 20 * Math.log10(rms);
  return redondear(acotarDb(dbfs + calibracionDb));
}

/** Convierte una lectura de metering en dBFS (-160..0) a dB aproximados. */
export function dbfsANivelDb(dbfs: number, calibracionDb = CALIBRACION_POR_DEFECTO_DB): number {
  if (!Number.isFinite(dbfs)) return PISO_DB;
  return redondear(acotarDb(dbfs + calibracionDb));
}

/** Promedio energético (Leq) de varios niveles en dB. */
export function promedioEnergetico(niveles: readonly number[]): number {
  if (niveles.length === 0) {
    throw new RangeError('Se necesita al menos una muestra para calcular Leq');
  }
  const energia = niveles.reduce((suma, n) => suma + 10 ** (n / 10), 0);
  return 10 * Math.log10(energia / niveles.length);
}

export function clasificar(nivelDb: number): Categoria {
  const umbral = UMBRALES.find((u) => nivelDb < u.hasta);
  return umbral?.categoria ?? 'muy-ruidoso';
}

/** Construye el resumen numérico listo para enviar a la API. */
export function resumirSesion(
  zonaId: string,
  niveles: readonly number[],
  duracionSeg: number,
): NuevaMedicion {
  if (niveles.length === 0) {
    throw new RangeError('No hay muestras en la sesión');
  }
  const leqDb = redondear(promedioEnergetico(niveles));
  const minDb = redondear(Math.min(...niveles));
  const maxDb = redondear(Math.max(...niveles));
  return {
    zonaId,
    leqDb: Math.min(maxDb, Math.max(minDb, leqDb)),
    minDb,
    maxDb,
    duracionSeg: Math.max(5, Math.round(duracionSeg)),
    muestras: niveles.length,
  };
}
