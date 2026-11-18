// practica_area1.js — Catàleg de pràctica oral (Àrea 1)
// ✅ Pinta convocatòries i marca estat: Pendent / Fet / Assolit (≥60%)
// ✅ Coherent amb l'Àrea 2: data-status="fet" | data-status="assolit" (sense verd/vermell)
//
// Regla (oral):
// - Fet: hi ha almenys un intent (tipus=oral) per a la convocatòria
// - Assolit: hi ha intents assolits (≥60%) a Àudio 1 i Àudio 2 per a la convocatòria

import {
  AREA1_LECTURES_BY_CONVOCATORIA as AREA1_CONVOCATORIES,
} from "./lectures/index_lectures_area1.js";

import { loadRecentAttempts } from "./stats.js";
import { auth } from "./firebase.js";

// Converteix una clau de convocatòria (p. ex. 'B2_GEN_24') en { any, mes }
function metaFromConvocatoria(key) {
  const m = String(key || "").match(/^B2_(GEN|MAIG)_(\d{2})$/i);
  if (!m) return { any: "", mes: "" };

  const mesCode = m[1].toUpperCase();
  const yy = m[2];
  const anyNum = 2000 + Number(yy);
  const mes = mesCode === "GEN" ? "Gener" : "Maig";

  return { any: String(anyNum), mes };
}

function countLectures(bloc) {
  return Array.isArray(bloc?.lectures) ? bloc.lectures.length : 0;
}

function countPreguntesLectora(bloc) {
  if (!Array.isArray(bloc?.lectures)) return 0;
  return bloc.lectures.reduce(
    (acc, l) => acc + (Array.isArray(l?.preguntes) ? l.preguntes.length : 0),
    0
  );
}

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

// Calcula status per convocatòria (oral)
function buildStatusByConv(attempts) {
  const byConv = Object.create(null);

  // Filtram intents d'Àrea 1, pràctica, oral
  const oral = (attempts || []).filter(a =>
    a && Number(a.area ?? a.areaId) === 1 &&
    a.mode === 'practica' &&
    (a.tipus === 'oral' || a.subtest === 'audio1' || a.subtest === 'audio2') &&
    typeof a.convocatoria === 'string'
  );

  for (const a of oral) {
    const conv = a.convocatoria;
    const sub = a.subtest; // 'audio1' | 'audio2'

    if (!byConv[conv]) {
      byConv[conv] = { any: false, a1: false, a2: false };
    }

    byConv[conv].any = true;

    const encerts = Number(a.encerts || 0);
    const total = Number(a.total || 0);
    const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(encerts, total);

    if (sub === 'audio1' && p >= 60) byConv[conv].a1 = true;
    if (sub === 'audio2' && p >= 60) byConv[conv].a2 = true;

    // Si l'intent no té subtest (casos antics), el contam com "fet" però no "assolit"
  }

  // Convertim a mapa final 'fet' | 'assolit'
  const status = Object.create(null);
  for (const conv of Object.keys(byConv)) {
    const s = byConv[conv];
    if (s.a1 && s.a2) status[conv] = 'assolit';
    else if (s.any) status[conv] = 'fet';
  }

  return status;
}

export function initPracticaArea1() {
  const el = document.getElementById("a1List");
  if (!el) return;

  el.innerHTML = "";

  const items = [...AREA1_CONVOCATORIES];

  // 1) Pintam les targetes (pendent per defecte)
  items.forEach((bloc) => {
    const { any, mes } = metaFromConvocatoria(bloc.convocatoria);
    const lecturesCount = countLectures(bloc);
    const preguntesLectora = countPreguntesLectora(bloc);

    const a = document.createElement("a");
    a.href = `#/area1/${bloc.convocatoria}`; // obre la prova d’Àrea 1 (oral + lectora)
    a.dataset.conv = bloc.convocatoria;

    a.innerHTML = `
      <div class="a1-card-title">${any} · ${mes}</div>
      <div class="a1-card-sub">${bloc.convocatoria}</div>
      <div class="a1-card-meta">🎧 2 àudios · 10 preguntes</div>
      <div class="a1-card-meta">📄 ${lecturesCount} lectures · ${preguntesLectora} preguntes</div>
      <div class="a1-card-cta">Accedeix →</div>
    `;

    el.appendChild(a);
  });

  // 2) Carregam intents i marcam estats (fet / assolit)
  (async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const attempts = await loadRecentAttempts(user.uid, 250);
      const statusByConv = buildStatusByConv(attempts);

      el.querySelectorAll('a[data-conv]').forEach(a => {
        const conv = a.dataset.conv;
        const st = statusByConv[conv];
        if (st) a.setAttribute('data-status', st);
      });
    } catch (e) {
      console.warn('No he pogut marcar estats de pràctica oral (Àrea 1):', e);
    }
  })();
}
