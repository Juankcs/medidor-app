import type { Zona } from './tipos';

export const ZONAS_LOCALES: readonly Zona[] = [
  { id: 'biblioteca', nombre: 'Biblioteca', descripcion: 'Sala de lectura principal' },
  { id: 'cafeteria', nombre: 'Cafetería', descripcion: 'Zona de mesas y filas' },
  { id: 'plazoleta', nombre: 'Plazoleta central', descripcion: 'Espacio abierto entre bloques' },
  { id: 'laboratorios', nombre: 'Laboratorios', descripcion: 'Pasillo de laboratorios' },
  { id: 'coliseo', nombre: 'Coliseo', descripcion: 'Escenario deportivo cubierto' },
  { id: 'sala-estudio', nombre: 'Sala de estudio', descripcion: 'Cubículos de estudio grupal' },
];
