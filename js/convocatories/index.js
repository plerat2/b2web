// convocatories/index.js
// Índex únic de convocatòries (B2 · Àrea 2)
// ✅ Exporta els noms que espera l'app: ANYS i CONVOCATORIES_B2.
// ✅ Manté també AREA2_CONVOCATORIES i AREA2_INDEX per compatibilitat.

import { b2_gen20 } from './area2/b2_gen20_area2_COMPLET.js';
import { b2_set21 } from './area2/b2_set21_area2_COMPLET.js';
import { b2_gen21 } from './area2/b2_gen21_area2_COMPLET.js';
import { b2_gen22 } from './area2/b2_gen22_area2_COMPLET.js';
import { b2_maig22 } from './area2/b2_maig22_area2_COMPLET.js';
import { b2_gen23 } from './area2/b2_gen23_area2_COMPLET.js';
import { b2_maig23 } from './area2/b2_maig23_area2_COMPLET.js';
import { b2_gen24 } from './area2/b2_gen24_area2_COMPLET.js';
import { b2_maig24 } from './area2/b2_maig24_area2_COMPLET.js';
import { b2_gen25 } from './area2/b2_gen25_area2_COMPLET.js';
import { b2_maig25 } from './area2/b2_maig25_area2_COMPLET.js';
import { b2_gen26 } from './area2/b2_gen26_area2_COMPLET.js';
import { b2_maig26 } from "./area2/b2_maig26_area2_COMPLET.js";

// Llista principal (ordre cronològic)
export const AREA2_CONVOCATORIES = [
  b2_gen20,
  b2_set21,
  b2_gen21,
  b2_gen22,
  b2_maig22,
  b2_gen23,
  b2_maig23,
  b2_gen24,
  b2_maig24,
  b2_gen25,
  b2_maig25,
  b2_gen26,
  b2_maig26
];

// Alias amb el nom que espera el router (error: "does not provide export named CONVOCATORIES_B2")
export const CONVOCATORIES_B2 = AREA2_CONVOCATORIES;

// ANYS per al selector de convocatòries (p. ex. [2020,2021,2022,2023,2024,2025,2026])
export const ANYS = Array.from(
  new Set(AREA2_CONVOCATORIES.map(c => Number(c.any)))
).sort((a, b) => a - b);

// Índex ràpid per id (p. ex. AREA2_INDEX['B2_MAIG_25'])
export const AREA2_INDEX = AREA2_CONVOCATORIES.reduce((acc, bloc) => {
  acc[bloc.id] = bloc;
  return acc;
}, {});

// Grup per any (útil per loader.js)
export const CONVOCATORIES_BY_ANY = AREA2_CONVOCATORIES.reduce((acc, bloc) => {
  const y = Number(bloc.any);
  (acc[y] ||= []).push(bloc);
  return acc;
}, {});

export default {
  ANYS,
  CONVOCATORIES_B2,
  AREA2_CONVOCATORIES,
  AREA2_INDEX,
  CONVOCATORIES_BY_ANY,
};
