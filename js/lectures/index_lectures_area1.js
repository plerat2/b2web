// index_lectures_area1.js
// Índex únic de lectures (Àrea 1 · Comprensió lectora) — B2
// Estàndard CLEAN: PDFs (≤2 pàg.) + JS per convocatòria, amb paths curts.
// Col·loca aquest fitxer dins: js/lectures/
// i assegura que els fitxers següents existeixen al mateix directori:
//   - B2_a1_gen24_lectures.js
//   - B2_a1_maig24_lectures.js
//   - B2_a1_gen25_lectures.js
//   - B2_a1_maig25_lectures.js
//   - B2_a1_gen26_lectures.js
//   - B2_a1_maig26_lectures.js



import B2_A1_GEN24_LECTURES from './B2_a1_gen24_lectures.js';
import B2_A1_MAIG24_LECTURES from './B2_a1_maig24_lectures.js';
import B2_A1_GEN25_LECTURES from './B2_a1_gen25_lectures.js';
import B2_A1_MAIG25_LECTURES from './B2_a1_maig25_lectures.js';
import B2_A1_GEN26_LECTURES from './B2_a1_gen26_lectures.js';
import B2_A1_MAIG26_LECTURES from './B2_a1_maig26_lectures.js';
import { b2_maig26 } from '../convocatories/area2/b2_maig26_area2_COMPLET.js';


// Ordre cronològic (per facilitar la navegació)
export const AREA1_LECTURES_BY_CONVOCATORIA = [
  B2_A1_GEN24_LECTURES,
  B2_A1_MAIG24_LECTURES,
  B2_A1_GEN25_LECTURES,
  B2_A1_MAIG25_LECTURES,
  B2_A1_GEN26_LECTURES,
  B2_A1_MAIG26_LECTURES,
];

// Llista plana de totes les lectures (cada element és una lectura amb id, títol, pdf i preguntes)
export const AREA1_LECTURES = AREA1_LECTURES_BY_CONVOCATORIA.flatMap((bloc) => bloc.lectures);

// Índex ràpid per id de lectura (p. ex. 'B2_GEN25_L2')
export const AREA1_LECTURES_BY_ID = Object.fromEntries(
  AREA1_LECTURES.map((l) => [l.id, l])
);

// Índex per convocatòria (p. ex. 'B2_MAIG_25')
export const AREA1_BY_CONVOCATORIA = Object.fromEntries(
  AREA1_LECTURES_BY_CONVOCATORIA.map((bloc) => [bloc.convocatoria, bloc])
);

// Helpers
export function getLecturaById(id) {
  return AREA1_LECTURES_BY_ID[id] || null;
}

export function getBlocByConvocatoria(convocatoria) {
  return AREA1_BY_CONVOCATORIA[convocatoria] || null;
}

export function listConvocatoriesArea1() {
  return AREA1_LECTURES_BY_CONVOCATORIA.map((b) => b.convocatoria);
}

export default {
  area: 1,
  tipus: 'lectora',
  convocatories: AREA1_LECTURES_BY_CONVOCATORIA,
  lectures: AREA1_LECTURES,
  byId: AREA1_LECTURES_BY_ID,
  byConvocatoria: AREA1_BY_CONVOCATORIA,
  getLecturaById,
  getBlocByConvocatoria,
  listConvocatoriesArea1,
};
