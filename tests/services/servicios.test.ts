import {
  ClienteApi,
  validarMedicion,
  validarRanking,
  validarZona,
} from '../../src/services/clienteApi';
import { SesionMedicion } from '../../src/services/sesionMedicion';

function respuestaJson(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SesionMedicion', () => {
  it('procesa buffers PCM y niveles dB descartando las muestras crudas', () => {
    let t = 1_000;
    const sesion = new SesionMedicion(90, () => t);
    sesion.iniciar();
    const e1 = sesion.procesarBufferPcm([0.1, -0.1, 0.1, -0.1]);
    expect(e1).toEqual({ actualDb: 70, categoria: 'ruidoso', muestras: 1 });
    t = 16_000;
    const e2 = sesion.registrarNivelDb(60);
    expect(e2.muestras).toBe(2);
    const resumen = sesion.finalizar('cafeteria');
    expect(resumen).toEqual({
      zonaId: 'cafeteria',
      leqDb: 67.4,
      minDb: 60,
      maxDb: 70,
      duracionSeg: 15,
      muestras: 2,
    });
  });

  it('inicia el reloj automáticamente si se procesa sin llamar a iniciar()', () => {
    const sesion = new SesionMedicion(90, () => 5_000);
    sesion.procesarBufferPcm([0.01, -0.01]);
    const r = sesion.finalizar('biblioteca');
    expect(r.duracionSeg).toBe(5);
  });

  it('también inicia reloj en registrarNivelDb y finaliza con 5s si no había inicio', () => {
    const sesion = new SesionMedicion(90, () => 5_000);
    sesion.registrarNivelDb(45);
    expect(sesion.finalizar('biblioteca').leqDb).toBe(45);
  });
});

describe('ClienteApi y validadores de datos externos', () => {
  const nuevaMedicionValida = {
    zonaId: 'biblioteca',
    leqDb: 40,
    minDb: 35,
    maxDb: 45,
    duracionSeg: 10,
    muestras: 20,
  };

  const medicionValida = {
    ...nuevaMedicionValida,
    id: 'm1',
    fecha: '2026-11-20T10:00:00.000Z',
  };

  const rankingValido = {
    masRuidosas: [
      {
        zona: { id: 'cafeteria', nombre: 'Cafetería', descripcion: 'Mesas' },
        mediciones: 3,
        leqDb: 70,
        maxDb: 80,
        categoria: 'ruidoso',
      },
    ],
    masSilenciosas: [],
    sinDatos: [{ id: 'coliseo', nombre: 'Coliseo', descripcion: 'Cancha' }],
  };

  it('lista zonas, envía mediciones y obtiene el ranking validando respuestas', async () => {
    const llamadas: string[] = [];
    const fetchMock = async (url: string): Promise<Response> => {
      llamadas.push(url);
      if (url.endsWith('/api/zonas')) {
        return respuestaJson([{ id: 'biblioteca', nombre: 'Biblioteca', descripcion: 'Sala' }]);
      }
      if (url.endsWith('/api/mediciones')) {
        return respuestaJson(medicionValida, 201);
      }
      return respuestaJson(rankingValido);
    };
    const api = new ClienteApi('http://localhost:3000', fetchMock);
    expect(await api.listarZonas()).toHaveLength(1);
    expect((await api.enviarMedicion(nuevaMedicionValida)).id).toBe('m1');
    expect((await api.obtenerRanking(3)).masRuidosas[0]?.zona.id).toBe('cafeteria');
    expect(llamadas).toHaveLength(3);
  });

  it('falla ante errores HTTP o respuestas malformadas', async () => {
    const apiError = new ClienteApi('http://localhost:3000', async () => respuestaJson({}, 500));
    await expect(apiError.listarZonas()).rejects.toThrow('HTTP 500');
    await expect(
      apiError.enviarMedicion({
        zonaId: 'a',
        leqDb: 40,
        minDb: 35,
        maxDb: 45,
        duracionSeg: 10,
        muestras: 5,
      }),
    ).rejects.toThrow('HTTP 500');
    await expect(apiError.obtenerRanking()).rejects.toThrow('HTTP 500');

    const apiNoLista = new ClienteApi('http://localhost:3000', async () => respuestaJson({}));
    await expect(apiNoLista.listarZonas()).rejects.toThrow('no es una lista');

    expect(() => validarZona(null)).toThrow();
    expect(() => validarZona({ id: 1 })).toThrow();
    expect(() => validarMedicion(null)).toThrow();
    expect(() => validarMedicion({ id: '1' })).toThrow();
    expect(() => validarRanking(null)).toThrow();
    expect(() => validarRanking({ masRuidosas: 'no' })).toThrow();
    expect(() =>
      validarRanking({
        masRuidosas: [{ zona: { id: 'a', nombre: 'a', descripcion: 'a' }, mediciones: 'x' }],
        masSilenciosas: [],
        sinDatos: [],
      }),
    ).toThrow();
    expect(() =>
      validarRanking({ masRuidosas: [null], masSilenciosas: [], sinDatos: [] }),
    ).toThrow();
  });
});
