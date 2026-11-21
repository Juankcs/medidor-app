import { CALIBRACION_POR_DEFECTO_DB } from './domain/acustica';

export interface ConfigApp {
  apiUrl: string;
  calibracionDb: number;
}

export function leerConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ConfigApp {
  const apiUrl = (env.EXPO_PUBLIC_API_URL ?? 'https://medidor-api.vercel.app').replace(/\/+$/, '');
  const crudo = Number(env.EXPO_PUBLIC_CALIBRACION_DB);
  const calibracionDb = Number.isFinite(crudo) && crudo > 0 ? crudo : CALIBRACION_POR_DEFECTO_DB;
  return { apiUrl, calibracionDb };
}
