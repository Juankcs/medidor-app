import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Categoria, NuevaMedicion, Zona } from '../domain/tipos';

interface Props {
  zonas: readonly Zona[];
  zonaActiva: string;
  onCambiarZona: (id: string) => void;
  midiendo: boolean;
  actualDb: number;
  categoria: Categoria;
  muestras: number;
  ultimoResumen: NuevaMedicion | null;
  mensaje: string | null;
  onIniciar: () => void;
  onDetenerYEnviar: () => void;
}

const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  silencioso: 'Silencioso (< 45 dB)',
  moderado: 'Moderado (45-60 dB)',
  ruidoso: 'Ruidoso (60-75 dB)',
  'muy-ruidoso': 'Muy ruidoso (>= 75 dB)',
};

export function PantallaMedir(props: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.subtitulo}>1. Elija la zona del campus</Text>
      <View style={estilos.chips}>
        {props.zonas.map((z) => {
          const activa = z.id === props.zonaActiva;
          return (
            <Pressable
              key={z.id}
              onPress={() => props.onCambiarZona(z.id)}
              style={[estilos.chip, activa ? estilos.chipActivo : null]}
            >
              <Text style={activa ? estilos.chipTextoActivo : estilos.chipTexto}>{z.nombre}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={estilos.tarjetaLectura}>
        <Text style={estilos.valorDb}>{props.actualDb.toFixed(1)} dB</Text>
        <Text style={estilos.categoria}>{ETIQUETA_CATEGORIA[props.categoria]}</Text>
        <Text style={estilos.privacidad}>
          Sin guardar audio: solo se calcula el nivel en dB en memoria ({props.muestras} muestras).
        </Text>
      </View>

      <Pressable
        onPress={props.midiendo ? props.onDetenerYEnviar : props.onIniciar}
        style={[estilos.boton, props.midiendo ? estilos.botonDetener : estilos.botonIniciar]}
      >
        <Text style={estilos.botonTexto}>
          {props.midiendo ? 'Detener y enviar resumen en dB' : 'Iniciar medición'}
        </Text>
      </Pressable>

      {props.ultimoResumen ? (
        <Text style={estilos.resumen}>
          Último envío ({props.ultimoResumen.zonaId}): Leq {props.ultimoResumen.leqDb} dB · mín{' '}
          {props.ultimoResumen.minDb} dB · máx {props.ultimoResumen.maxDb} dB
        </Text>
      ) : null}
      {props.mensaje ? <Text style={estilos.mensaje}>{props.mensaje}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 12 },
  subtitulo: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
  chipActivo: { backgroundColor: '#0f172a' },
  chipTexto: { color: '#0f172a', fontSize: 13 },
  chipTextoActivo: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  tarjetaLectura: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    gap: 6,
  },
  valorDb: { fontSize: 42, fontWeight: '700', color: '#0f172a' },
  categoria: { fontSize: 16, fontWeight: '600', color: '#334155' },
  privacidad: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  boton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  botonIniciar: { backgroundColor: '#0284c7' },
  botonDetener: { backgroundColor: '#dc2626' },
  botonTexto: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  resumen: { fontSize: 13, color: '#0f766e', textAlign: 'center' },
  mensaje: { fontSize: 13, color: '#b91c1c', textAlign: 'center' },
});
