import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { leerConfig } from './src/config';
import type { Ranking } from './src/domain/tipos';
import { ZONAS_LOCALES } from './src/domain/zonas';
import { useMedidor, type EstadoMedidor } from './src/hooks/useMedidor';
import { PantallaMedir } from './src/screens/PantallaMedir';
import { PantallaRanking } from './src/screens/PantallaRanking';
import { ClienteApi } from './src/services/clienteApi';

type Pestana = 'medir' | 'ranking';

function BarraPestanas({
  pestana,
  onElegir,
}: {
  pestana: Pestana;
  onElegir: (p: Pestana) => void;
}) {
  return (
    <View style={estilos.pestanas}>
      <Pressable
        onPress={() => onElegir('medir')}
        style={[estilos.tab, pestana === 'medir' ? estilos.tabActiva : null]}
      >
        <Text style={estilos.tabTexto}>Medir zona</Text>
      </Pressable>
      <Pressable
        onPress={() => onElegir('ranking')}
        style={[estilos.tab, pestana === 'ranking' ? estilos.tabActiva : null]}
      >
        <Text style={estilos.tabTexto}>Ranking del campus</Text>
      </Pressable>
    </View>
  );
}

function useControladorCampus(api: ClienteApi, medidor: EstadoMedidor, zonaActiva: string) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarRanking = useCallback(async () => {
    setCargando(true);
    try {
      setRanking(await api.obtenerRanking(3));
      setAviso(null);
    } catch {
      setAviso('No se pudo conectar con la API del campus.');
    } finally {
      setCargando(false);
    }
  }, [api]);

  const detenerYEnviar = useCallback(async () => {
    const resumen = medidor.detener(zonaActiva);
    if (!resumen) return;
    try {
      await api.enviarMedicion(resumen);
      await cargarRanking();
      setAviso(null);
    } catch {
      setAviso('Medición calculada localmente; no se pudo enviar a la API.');
    }
  }, [api, cargarRanking, medidor, zonaActiva]);

  return { ranking, cargando, aviso, cargarRanking, detenerYEnviar };
}

export default function App() {
  const config = useMemo(() => leerConfig(), []);
  const api = useMemo(() => new ClienteApi(config.apiUrl), [config.apiUrl]);
  const medidor = useMedidor(config.calibracionDb);
  const [pestana, setPestana] = useState<Pestana>('medir');
  const [zonaActiva, setZonaActiva] = useState(ZONAS_LOCALES[0]?.id ?? 'biblioteca');
  const campus = useControladorCampus(api, medidor, zonaActiva);

  const elegirPestana = (nueva: Pestana) => {
    setPestana(nueva);
    if (nueva === 'ranking') void campus.cargarRanking();
  };

  return (
    <ScrollView contentContainerStyle={estilos.pantalla}>
      <Text style={estilos.titulo}>Medidor de ruido del campus</Text>
      <BarraPestanas pestana={pestana} onElegir={elegirPestana} />
      {pestana === 'medir' ? (
        <PantallaMedir
          zonas={ZONAS_LOCALES}
          zonaActiva={zonaActiva}
          onCambiarZona={setZonaActiva}
          midiendo={medidor.midiendo}
          actualDb={medidor.actualDb}
          categoria={medidor.categoria}
          muestras={medidor.muestras}
          ultimoResumen={medidor.ultimoResumen}
          mensaje={medidor.error ?? campus.aviso}
          onIniciar={() => void medidor.iniciar()}
          onDetenerYEnviar={() => void campus.detenerYEnviar()}
        />
      ) : (
        <PantallaRanking
          ranking={campus.ranking}
          cargando={campus.cargando}
          onRecargar={() => void campus.cargarRanking()}
        />
      )}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 32, gap: 16 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pestanas: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabActiva: { backgroundColor: '#cbd5e1' },
  tabTexto: { fontWeight: '700', color: '#0f172a' },
});
