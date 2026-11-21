import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Ranking, ResumenZona } from '../domain/tipos';

interface Props {
  ranking: Ranking | null;
  cargando: boolean;
  onRecargar: () => void;
}

function BloqueLista({ titulo, items }: { titulo: string; items: readonly ResumenZona[] }) {
  return (
    <View style={estilos.bloque}>
      <Text style={estilos.tituloBloque}>{titulo}</Text>
      {items.length === 0 ? (
        <Text style={estilos.vacio}>Aún no hay mediciones registradas.</Text>
      ) : (
        items.map((item, idx) => (
          <View key={item.zona.id} style={estilos.fila}>
            <Text style={estilos.nombre}>
              {idx + 1}. {item.zona.nombre}
            </Text>
            <Text style={estilos.metrica}>
              Leq {item.leqDb} dB · máx {item.maxDb} dB ({item.mediciones})
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function PantallaRanking({ ranking, cargando, onRecargar }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Pressable onPress={onRecargar} style={estilos.botonRecargar}>
        <Text style={estilos.botonTexto}>
          {cargando ? 'Actualizando...' : 'Actualizar ranking del campus'}
        </Text>
      </Pressable>
      <BloqueLista titulo="Zonas más ruidosas (Leq dB)" items={ranking?.masRuidosas ?? []} />
      <BloqueLista titulo="Zonas más silenciosas (Leq dB)" items={ranking?.masSilenciosas ?? []} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 14 },
  botonRecargar: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  botonTexto: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  bloque: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  tituloBloque: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  nombre: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  metrica: { fontSize: 13, color: '#475569' },
  vacio: { fontSize: 13, color: '#64748b' },
});
