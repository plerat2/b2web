// stats.js — Estadística B2 (personal)
// Manté exports que el router usa: loadLastAttempt, loadRecentAttempts, renderLastAttempt, setupEstadistica
// ✅ Mitjanes per àrees (Àrea 1 / Àrea 2) i semàfor global d'objectiu: mínim 60% a cada àrea.
// Orientat a aprenentatge: per defecte mostra "Tot" (pràctica + convocatòries).

import { rtdb } from './firebase.js';
import { ref, query, orderByChild, limitToLast, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const PASS_PCT = 60;

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

function fmt(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function areaLabel(a) {
  const ar = (a && (a.area ?? a.areaId ?? null));
  return ar ? `Àrea ${ar}` : '';
}

function titleLabel(a) {
  const base = (a.mode === 'convocatoria') ? (a.convocatoria || 'Convocatòria') : 'Pràctica';
  const al = areaLabel(a);
  return al ? `${base} · ${al}` : base;
}

function normalizeArea(a) {
  const ar = a?.area ?? a?.areaId ?? null;
  const n = Number(ar);
  return Number.isFinite(n) ? n : null;
}

// --- Lectures (per usuari) ---
export async function loadLastAttempt(uid) {
  const q = query(ref(rtdb, `users/${uid}/attempts`), orderByChild('timestamp'), limitToLast(1));
  const snap = await get(q);
  if (!snap.exists()) return null;
  const obj = snap.val();
  const id = Object.keys(obj)[0];
  return { id, ...obj[id] };
}

export async function loadRecentAttempts(uid, n = 50) {
  const q = query(ref(rtdb, `users/${uid}/attempts`), orderByChild('timestamp'), limitToLast(n));
  const snap = await get(q);
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function renderLastAttempt(el, a) {
  if (!a) {
    el.innerHTML = '<p class="text-lg text-gray-200">Encara no hi ha cap prova registrada.</p>';
    return;
  }

  const e = Number(a.encerts || 0);
  const t = Number(a.total || 0);
  const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(e, t);
  const title = titleLabel(a);

  el.innerHTML = `
    <div class="card-mini">
      <div class="text-2xl font-bold">${title}</div>
      <div class="text-sm text-gray-200 mt-1">${fmt(a.timestamp)}</div>
      <div class="text-xl font-bold mt-3">${p}%</div>
      <div class="text-sm text-gray-200">${e}/${t} · Blancs: ${a.blancs ?? 0}</div>
    </div>
  `;
}

// --- Càlculs ---
function computeSummary(attempts) {
  const n = attempts.length;
  if (!n) return { n: 0, avgPct: 0, avgEnc: 0, avgTot: 0, bestPct: 0, bestEnc: 0, bestTot: 0 };

  let sumEnc = 0, sumTot = 0;
  let bestPct = -1, bestEnc = 0, bestTot = 0;

  for (const a of attempts) {
    const e = Number(a.encerts || 0);
    const t = Number(a.total || 0);
    sumEnc += e;
    sumTot += t;

    const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(e, t);
    if (p > bestPct) {
      bestPct = p;
      bestEnc = e;
      bestTot = t;
    }
  }

  const avgTot = Math.round(sumTot / n);

  return {
    n,
    avgEnc: Math.round(sumEnc / n),
    avgTot,
    avgPct: sumTot ? Math.round((sumEnc / sumTot) * 100) : 0,
    bestPct: Math.max(0, bestPct),
    bestEnc,
    bestTot
  };
}

function splitByArea(attempts) {
  const a1 = [];
  const a2 = [];
  const other = [];

  for (const a of attempts) {
    const ar = normalizeArea(a);
    if (ar === 1) a1.push(a);
    else if (ar === 2) a2.push(a);
    else other.push(a);
  }

  return { a1, a2, other };
}

function areaBadge(avgPct) {
  const ok = avgPct >= PASS_PCT;
  return ok
    ? `<span class="ml-2 inline-block px-2 py-1 rounded-lg bg-green-500/20 border border-green-300/30 text-green-100 text-xs font-bold">✅ ≥ ${PASS_PCT}%</span>`
    : `<span class="ml-2 inline-block px-2 py-1 rounded-lg bg-red-500/20 border border-red-300/30 text-red-100 text-xs font-bold">❌ &lt; ${PASS_PCT}%</span>`;
}

function globalTrafficLight(s1, s2) {
  const ok1 = s1.avgPct >= PASS_PCT;
  const ok2 = s2.avgPct >= PASS_PCT;

  if (ok1 && ok2) {
    return {
      html: `<div class="text-3xl font-bold text-green-100">MOLT BÉ!</div>
             <div class="text-sm text-gray-200 mt-1">✅ Has superat el ${PASS_PCT}% a l'Àrea 1 i a l'Àrea 2</div>`,
      cls: "bg-green-500/20 border border-green-300/30"
    };
  }

  const missing = [
    ok1 ? null : `Àrea 1 < ${PASS_PCT}%`,
    ok2 ? null : `Àrea 2 < ${PASS_PCT}%`
  ].filter(Boolean).join(" · ");

  return {
    html: `<div class="text-3xl font-bold text-red-100">ENCARA NO</div>
           <div class="text-sm text-gray-200 mt-1">Objectiu: ${missing}</div>`,
    cls: "bg-red-500/20 border border-red-300/30"
  };
}

function renderCards(cardsEl, all) {
  if (!cardsEl) return;

  const overall = computeSummary(all);
  const { a1, a2 } = splitByArea(all);
  const s1 = computeSummary(a1);
  const s2 = computeSummary(a2);

  const sem = globalTrafficLight(s1, s2);

  cardsEl.innerHTML = `
    <div class="card-mini ${sem.cls}">
      <div class="text-sm text-gray-200">Semàfor global (objectiu)</div>
      ${sem.html}
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Intents (total)</div>
      <div class="text-3xl font-bold mt-1">${overall.n}</div>
      <div class="text-sm text-gray-200 mt-1">A1: ${s1.n} · A2: ${s2.n}</div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Mitjana % · Àrea 1</div>
      <div class="text-3xl font-bold mt-1">${s1.avgPct}%${areaBadge(s1.avgPct)}</div>
      <div class="text-sm text-gray-200 mt-1">${s1.avgEnc} sobre ${s1.avgTot || '-'} (mitjana)</div>
      <div class="progress mt-3"><span style="width:${s1.avgPct}%"></span></div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Mitjana % · Àrea 2</div>
      <div class="text-3xl font-bold mt-1">${s2.avgPct}%${areaBadge(s2.avgPct)}</div>
      <div class="text-sm text-gray-200 mt-1">${s2.avgEnc} sobre ${s2.avgTot || '-'} (mitjana)</div>
      <div class="progress mt-3"><span style="width:${s2.avgPct}%"></span></div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Millor %</div>
      <div class="text-3xl font-bold mt-1">${overall.bestPct}%</div>
      <div class="text-sm text-gray-200 mt-1">${overall.bestEnc}/${overall.bestTot}</div>
    </div>
  `;
}

function renderRecent(recentEl, attempts) {
  if (!recentEl) return;

  if (!attempts.length) {
    recentEl.innerHTML = '<div class="text-gray-200">Encara no hi ha intents.</div>';
    return;
  }

  const recent = [...attempts]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 20);

  recentEl.innerHTML = recent.map(a => {
    const e = Number(a.encerts || 0);
    const t = Number(a.total || 0);
    const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(e, t);
    const title = titleLabel(a);

    return `
      <div class="card-mini flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="font-bold">${title}</div>
          <div class="text-sm text-gray-200">${fmt(a.timestamp)}</div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold">${p}%</div>
          <div class="text-sm text-gray-200">${e}/${t}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function setupEstadistica(allAttempts) {
  const cardsEl = document.getElementById('statsCards');
  const recentEl = document.getElementById('statsRecent');
  const hintEl = document.getElementById('statsHint');

  const btnConv = document.getElementById('btnConv');
  const btnPract = document.getElementById('btnPract');
  const btnTots = document.getElementById('btnTots');

  // Per defecte, mostram tot (aprenentatge)
  let mode = 'tots'; // conv | pract | tots

  function applyActive() {
    btnConv?.classList.toggle('active', mode === 'conv');
    btnPract?.classList.toggle('active', mode === 'pract');
    btnTots?.classList.toggle('active', mode === 'tots');

    if (hintEl) {
      hintEl.textContent = (mode === 'conv')
        ? `Convocatòries (Àrea 1 i Àrea 2). Objectiu: ${PASS_PCT}% a cada àrea.`
        : (mode === 'pract')
          ? `Pràctica (entrenament). Objectiu: ${PASS_PCT}% a cada àrea.`
          : `Tot (convocatòries + pràctica). Objectiu: ${PASS_PCT}% a cada àrea.`;
    }
  }

  function filterAttempts() {
    const list = (allAttempts || []);
    if (mode === 'conv') return list.filter(a => a.mode === 'convocatoria');
    if (mode === 'pract') return list.filter(a => a.mode === 'practica');
    return [...list];
  }

  function render() {
    applyActive();
    const list = filterAttempts();
    renderCards(cardsEl, list);
    renderRecent(recentEl, list);
  }

  btnConv?.addEventListener('click', () => { mode = 'conv'; render(); });
  btnPract?.addEventListener('click', () => { mode = 'pract'; render(); });
  btnTots?.addEventListener('click', () => { mode = 'tots'; render(); });

  render();

  return { getCurrentRecommendation: () => ({ weak: null, mode }) };
}
