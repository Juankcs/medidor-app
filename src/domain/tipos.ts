export interface Zona {
  id: string;
  nombre: string;
  descripcion: string;
}

/**
 * Resumen numérico de una sesión de medición.
 * Solo números: la app nunca guarda ni envía audio.
 */
export interface NuevaMedicion {
  zonaId: string;
  leqDb: number;
  minDb: number;
  maxDb: number;
  duracionSeg: number;
  muestras: number;
}

export interface Medicion extends NuevaMedicion {
  id: string;
  fecha: string;
}

export type Categoria = 'silencioso' | 'moderado' | 'ruidoso' | 'muy-ruidoso';

export interface ResumenZona {
  zona: Zona;
  mediciones: number;
  leqDb: number;
  maxDb: number;
  categoria: Categoria;
}

export interface Ranking {
  masRuidosas: ResumenZona[];
  masSilenciosas: ResumenZona[];
  sinDatos: Zona[];
}
