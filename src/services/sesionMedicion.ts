import { clasificar, pcmANivelDb, resumirSesion } from '../domain/acustica';
import type { Categoria, NuevaMedicion } from '../domain/tipos';

export interface EstadoInstantaneo {
  actualDb: number;
  categoria: Categoria;
  muestras: number;
}

/**
 * Acumula únicamente escalares en dB (un número por ventana) para una sesión de medición.
 * Los buffers PCM se reducen a un escalar y se descartan al instante.
 */
export class SesionMedicion {
  private readonly niveles: number[] = [];
  private inicioMs: number | null = null;

  constructor(
    private readonly calibracionDb: number,
    private readonly reloj: () => number = () => Date.now(),
  ) {}

  iniciar(): void {
    this.niveles.length = 0;
    this.inicioMs = this.reloj();
  }

  /** Procesa un buffer PCM float32 (-1..1), guarda solo el escalar dB y descarta el buffer. */
  procesarBufferPcm(muestrasPcm: ArrayLike<number>): EstadoInstantaneo {
    if (this.inicioMs === null) {
      this.inicioMs = this.reloj();
    }
    const actualDb = pcmANivelDb(muestrasPcm, this.calibracionDb);
    this.niveles.push(actualDb);
    return {
      actualDb,
      categoria: clasificar(actualDb),
      muestras: this.niveles.length,
    };
  }

  /** Registra un nivel ya expresado en dB (p. ej. para pruebas o simulación sin micrófono). */
  registrarNivelDb(nivelDb: number): EstadoInstantaneo {
    if (this.inicioMs === null) {
      this.inicioMs = this.reloj();
    }
    this.niveles.push(nivelDb);
    return {
      actualDb: nivelDb,
      categoria: clasificar(nivelDb),
      muestras: this.niveles.length,
    };
  }

  finalizar(zonaId: string): NuevaMedicion {
    const duracionSeg =
      this.inicioMs === null ? 5 : Math.max(5, (this.reloj() - this.inicioMs) / 1000);
    const resumen = resumirSesion(zonaId, this.niveles, duracionSeg);
    this.niveles.length = 0;
    this.inicioMs = null;
    return resumen;
  }
}
