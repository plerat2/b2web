// stats.js — Estadística B2 (orientada a aprenentatge)
// Manté exports que el router usa: loadLastAttempt, loadRecentAttempts, renderLastAttempt, setupEstadistica
// ✅ Marca intents "assolits" (≥60%) amb badge blau i dona feedback motivador.

import { rtdb } from './firebase.js';
import { ref, query, orderByChild, limitToLast, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const TARGET = 60;

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

function fmt(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function normalizeArea(a) {
  const ar = a?.area ?? a?.areaId ?? null;
  const n = Number(ar);
  return Number.isFinite(n) ? n : null;
}

function titleLabel(a) {
  const ar = normalizeArea(a);
  const tipus = a.tipus ? (a.tipus === 'oral' ? 'Oral' : 'Escrita') : null;

  const base = (a.mode === 'convocatoria')
    ? `Convocatòria · ${a.convocatoria || 'Prova'}`
    : `Pràctica${tipus ? ` · ${tipus}` : ''}${a.subtestLabel ? ` · ${a.subtestLabel}` : ''}`;

  return ar ? `${base} · Àrea ${ar}` : base;
}

function isPass(a) {
  const e = Number(a.encerts || 0);
  const t = Number(a.total || 0);
  const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(e, t);
  return p >= TARGET;
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
  const ok = p >= TARGET;

  el.innerHTML = `
    <div class="card-mini ${ok ? 'border border-blue-300/30 bg-blue-500/10' : ''}">
      <div class="text-2xl font-bold">${titleLabel(a)}
        ${ok ? '<span class="ml-2 px-2 py-1 rounded-lg bg-blue-500/25 border border-blue-300/30 text-blue-100 text-xs font-bold">✅ Assolit</span>' : ''}
      </div>
      <div class="text-sm text-gray-200 mt-1">${fmt(a.timestamp)}</div>
      <div class="text-xl font-bold mt-3">${p}%</div>
      <div class="text-sm text-gray-200">${e}/${t} · Blancs: ${a.blancs ?? 0}</div>
    </div>
  `;
}

function countPassByArea(attempts) {
  let a1 = 0, a2 = 0, other = 0;
  for (const a of attempts) {
    if (!isPass(a)) continue;
    const ar = normalizeArea(a);
    if (ar === 1) a1 += 1;
    else if (ar === 2) a2 += 1;
    else other += 1;
  }
  return { a1, a2, other };
}

function renderCards(cardsEl, attempts) {
  if (!cardsEl) return;
  const n = attempts.length;
  const pass = attempts.filter(isPass);
  const passN = pass.length;
  const byArea = countPassByArea(attempts);

  const msg = (byArea.a1 > 0 && byArea.a2 > 0)
    ? '🎉 Molt bé! Ja tens proves assolides a l’Àrea 1 i a l’Àrea 2.'
    : (passN > 0)
      ? '💙 Bona feina! Ja tens alguna prova assolida (≥60%).'
      : '💪 Ànims! Quan arribis al 60% en una prova, aquí la veuràs marcada en blau.';

  cardsEl.innerHTML = `
    <div class="card-mini border border-blue-300/20 bg-blue-500/10">
      <div class="text-sm text-gray-200">Objectiu didàctic</div>
      <div class="text-xl font-bold mt-2">≥ ${TARGET}% en qualsevol prova</div>
      <div class="text-sm text-gray-200 mt-2">${msg}</div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Intents</div>
      <div class="text-3xl font-bold mt-1">${n}</div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Assolits (≥${TARGET}%)</div>
      <div class="text-3xl font-bold mt-1">${passN}</div>
      <div class="text-sm text-gray-200 mt-1">A1: ${byArea.a1} · A2: ${byArea.a2}</div>
    </div>

    <div class="card-mini">
      <div class="text-sm text-gray-200">Darrer assoliment</div>
      <div class="text-lg font-bold mt-2">${passN ? fmt(pass[0].timestamp) : '—'}</div>
      <div class="text-sm text-gray-200 mt-1">${passN ? titleLabel(pass[0]) : 'Encara no n’hi ha'}</div>
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
    const ok = p >= TARGET;

    const badge = ok
      ? '<span class="ml-2 px-2 py-1 rounded-lg bg-blue-500/25 border border-blue-300/30 text-blue-100 text-xs font-bold">✅ Assolit</span>'
      : '';

    const cls = ok ? 'border border-blue-300/20 bg-blue-500/10' : '';

    return `
      <div class="card-mini flex flex-wrap items-center justify-between gap-3 ${cls}">
        <div>
          <div class="font-bold">${titleLabel(a)}${badge}</div>
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

  let mode = 'tots'; // per defecte, tot (aprenentatge)

  function applyActive() {
    btnConv?.classList.toggle('active', mode === 'conv');
    btnPract?.classList.toggle('active', mode === 'pract');
    btnTots?.classList.toggle('active', mode === 'tots');

    if (hintEl) {
      hintEl.textContent = (mode === 'conv')
        ? `Convocatòries (proves oficials) — es marquen en blau les que arriben al ${TARGET}%.`
        : (mode === 'pract')
          ? `Pràctica (entrenament) — es marquen en blau les que arriben al ${TARGET}%.`
          : `Tot (convocatòries + pràctica) — es marquen en blau les que arriben al ${TARGET}%.`;
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
