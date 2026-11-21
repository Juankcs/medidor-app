import type {
  Categoria,
  Medicion,
  NuevaMedicion,
  Ranking,
  ResumenZona,
  Zona,
} from '../domain/tipos';

export type FuncionFetch = (url: string, init?: RequestInit) => Promise<Response>;

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function esCategoria(v: unknown): v is Categoria {
  return v === 'silencioso' || v === 'moderado' || v === 'ruidoso' || v === 'muy-ruidoso';
}

export function validarZona(v: unknown): Zona {
  if (!esObjeto(v)) throw new Error('Zona inválida');
  const { id, nombre, descripcion } = v;
  if (typeof id !== 'string' || typeof nombre !== 'string' || typeof descripcion !== 'string') {
    throw new Error('Campos de zona inválidos');
  }
  return { id, nombre, descripcion };
}

export function validarMedicion(v: unknown): Medicion {
  if (!esObjeto(v)) throw new Error('Medición inválida');
  const { id, zonaId, leqDb, minDb, maxDb, duracionSeg, muestras, fecha } = v;
  const numeros = [leqDb, minDb, maxDb, duracionSeg, muestras].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
  if (
    typeof id !== 'string' ||
    typeof zonaId !== 'string' ||
    typeof fecha !== 'string' ||
    !numeros
  ) {
    throw new Error('Campos de medición inválidos');
  }
  return {
    id,
    zonaId,
    leqDb: Number(leqDb),
    minDb: Number(minDb),
    maxDb: Number(maxDb),
    duracionSeg: Number(duracionSeg),
    muestras: Number(muestras),
    fecha,
  };
}

function validarResumenZona(v: unknown): ResumenZona {
  if (!esObjeto(v)) throw new Error('Resumen de zona inválido');
  const { zona, mediciones, leqDb, maxDb, categoria } = v;
  const numeros = [mediciones, leqDb, maxDb].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
  if (!numeros || !esCategoria(categoria)) {
    throw new Error('Campos de resumen inválidos');
  }
  return {
    zona: validarZona(zona),
    mediciones: Number(mediciones),
    leqDb: Number(leqDb),
    maxDb: Number(maxDb),
    categoria,
  };
}

export function validarRanking(v: unknown): Ranking {
  if (!esObjeto(v)) throw new Error('Ranking inválido');
  const { masRuidosas, masSilenciosas, sinDatos } = v;
  if (!Array.isArray(masRuidosas) || !Array.isArray(masSilenciosas) || !Array.isArray(sinDatos)) {
    throw new Error('Listas de ranking inválidas');
  }
  return {
    masRuidosas: masRuidosas.map(validarResumenZona),
    masSilenciosas: masSilenciosas.map(validarResumenZona),
    sinDatos: sinDatos.map(validarZona),
  };
}

export class ClienteApi {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FuncionFetch = fetch,
  ) {}

  async listarZonas(): Promise<Zona[]> {
    const res = await this.fetchFn(`${this.baseUrl}/api/zonas`);
    if (!res.ok) throw new Error(`Error HTTP ${res.status} al listar zonas`);
    const datos: unknown = await res.json();
    if (!Array.isArray(datos)) throw new Error('Respuesta de zonas no es una lista');
    return datos.map(validarZona);
  }

  async enviarMedicion(nueva: NuevaMedicion): Promise<Medicion> {
    const res = await this.fetchFn(`${this.baseUrl}/api/mediciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nueva),
    });
    if (!res.ok) throw new Error(`Error HTTP ${res.status} al enviar medición`);
    return validarMedicion(await res.json());
  }

  async obtenerRanking(limite = 3): Promise<Ranking> {
    const res = await this.fetchFn(`${this.baseUrl}/api/ranking?limite=${limite}`);
    if (!res.ok) throw new Error(`Error HTTP ${res.status} al consultar ranking`);
    return validarRanking(await res.json());
  }
}
