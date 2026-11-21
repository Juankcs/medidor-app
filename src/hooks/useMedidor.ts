import { useCallback, useRef, useState } from 'react';
import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { clasificar } from '../domain/acustica';
import type { Categoria, NuevaMedicion } from '../domain/tipos';
import { SesionMedicion } from '../services/sesionMedicion';

export interface EstadoMedidor {
  midiendo: boolean;
  actualDb: number;
  categoria: Categoria;
  muestras: number;
  ultimoResumen: NuevaMedicion | null;
  error: string | null;
  iniciar: () => Promise<void>;
  detener: (zonaId: string) => NuevaMedicion | null;
}

/**
 * Hook que conecta el stream PCM en vivo de `expo-audio` con `SesionMedicion`.
 * NUNCA llama a `startFileRecordingAsync`: ningún byte de audio se escribe en disco.
 */
export function useMedidor(calibracionDb: number): EstadoMedidor {
  const sesionRef = useRef<SesionMedicion>(new SesionMedicion(calibracionDb));
  const [midiendo, setMidiendo] = useState(false);
  const [actualDb, setActualDb] = useState(35);
  const [categoria, setCategoria] = useState<Categoria>(clasificar(35));
  const [muestras, setMuestras] = useState(0);
  const [ultimoResumen, setUltimoResumen] = useState<NuevaMedicion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
      const pcm = new Float32Array(buffer.data);
      const estado = sesionRef.current.procesarBufferPcm(pcm);
      setActualDb(estado.actualDb);
      setCategoria(estado.categoria);
      setMuestras(estado.muestras);
    },
  });

  const iniciar = useCallback(async () => {
    setError(null);
    const permiso = await requestRecordingPermissionsAsync();
    if (!permiso.granted) {
      setError('Se requiere permiso de micrófono para medir el nivel de ruido.');
      return;
    }
    sesionRef.current.iniciar();
    setMuestras(0);
    await stream.start();
    setMidiendo(true);
  }, [stream]);

  const detener = useCallback(
    (zonaId: string): NuevaMedicion | null => {
      stream.stop();
      setMidiendo(false);
      try {
        const resumen = sesionRef.current.finalizar(zonaId);
        setUltimoResumen(resumen);
        return resumen;
      } catch {
        setError('No se capturaron suficientes muestras.');
        return null;
      }
    },
    [stream],
  );

  return { midiendo, actualDb, categoria, muestras, ultimoResumen, error, iniciar, detener };
}
