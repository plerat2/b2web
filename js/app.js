// app.js — Motor de prova + guardat a RTDB en acabar

import { estilOpcio, estilSeleccionada, estilCorrecta, estilIncorrecta } from './styles.js';
import { buildReport } from './report.js';
import { saveAttempt } from './db.js';
import { showToast } from './toast.js';
import { showCenterToast } from './centerToast.js';

let estat = {
  preguntes: [],
  index: 0,
  respostesUsuari: [],
  mode: 'convocatoria',
  user: null,
  convocatoria: null,
  startTs: null,
  stage: null,
  counted: []
};

// --- Helpers: escapar HTML i negreta amb **...** (Markdown simple) ---
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function boldify(str) {
  const safe = escapeHtml(str);
  return safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// --- Títol humà de convocatòria (accepta B2_MAIG_25 o b2_maig-25, etc.) ---
function prettyConvocatoria(id) {
  if (!id || typeof id !== 'string') return '';

  // Normalitza: guions -> underscores
  const norm = id.trim().replace(/-/g, '_');
  const parts = norm.split('_').filter(Boolean);

  // nivell
  const nivell = (parts[0] || 'B2').toUpperCase();

  // mes
  const mesRaw = (parts[1] || '').toLowerCase();
  const mesMap = { gen: 'Gener', maig: 'Maig', set: 'Setembre' };
  const mesTxt = mesMap[mesRaw] || (mesRaw ? mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1) : '');

  // any
  const any2 = parts[2] || '';
  const anyTxt = any2 ? (any2.length == 2 ? `20${any2}` : any2) : '';

  const areaTxt = 'Àrea 2';
  const dateTxt = [mesTxt, anyTxt].filter(Boolean).join(' ');
  return `${nivell} · ${areaTxt}${dateTxt ? ' · ' + dateTxt : ''}`.trim();
}

// --- Progrés d'entrenament/pràctica (comptador de preguntes) ---
function progressKey(uid, stage) { return `progress_${stage}_${uid}`; }
function incProgress(uid, stage) {
  const key = progressKey(uid, stage);
  const cur = Number(localStorage.getItem(key) || 0);
  const next = cur + 1;
  localStorage.setItem(key, String(next));
  window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { stage, count: next } }));
  return next;
}

// Comptador global (totes les preguntes contestades, entrenament + pràctica)
const TOTAL_GOAL = 1000;
function progressTotalKey(uid) { return `progress_total_${uid}`; }
function getTotalProgress(uid) { return Number(localStorage.getItem(progressTotalKey(uid)) || 0); }
function incTotalProgress(uid) {
  const key = progressTotalKey(uid);
  const cur = Number(localStorage.getItem(key) || 0);
  const next = cur + 1;
  localStorage.setItem(key, String(next));
  window.dispatchEvent(new CustomEvent('totalProgressUpdated', { detail: { count: next, goal: TOTAL_GOAL } }));
  return next;
}

// mode: 'convocatoria' (correcció al final) o 'practica' (correcció immediata)
export function iniciarProva(preguntes, { mode = 'convocatoria', user = null, convocatoria = null, stage = null } = {}) {
  estat.preguntes = preguntes;
  estat.index = 0;
  estat.respostesUsuari = new Array(preguntes.length).fill(null);
  estat.mode = mode;
  estat.user = user;
  estat.convocatoria = convocatoria;
  estat.stage = stage;
  estat.counted = new Array(preguntes.length).fill(false);
  estat.startTs = Date.now();
  pintarPregunta();
}

function pintarPregunta() {
  const q = estat.preguntes[estat.index];

  // Capçalera
  if (estat.mode === 'convocatoria') {
    const raw = q?.convocatoria || estat.convocatoria || '';
    const title = prettyConvocatoria(raw) || `Prova ${raw || 'B2'}`;
    document.getElementById('prova-titol').textContent = title;
    document.getElementById('prova-progres').textContent = `${estat.index + 1} / ${estat.preguntes.length}`;
  } else {
    const any = q?.convocatoria ? String(q.convocatoria) : '—';
    document.getElementById('prova-titol').textContent = `Pràctica · ${q.categoria}`;
    document.getElementById('prova-progres').textContent = `${estat.index + 1} / ${estat.preguntes.length} · Any: ${any}`;
  }

  // Enunciat
  document.getElementById('enunciat').innerHTML = boldify(q.enunciat);

  // Opcions
  const cont = document.getElementById('opcions');
  cont.innerHTML = '';

  for (const [lletra, text] of Object.entries(q.opcions)) {
    if (String(text).trim() === '') continue;
    const div = document.createElement('div');
    div.className = estilOpcio + ' opcio';
    div.dataset.lletra = lletra;
    div.innerHTML = `<strong>${lletra}</strong> — ${boldify(text)}`;
    div.addEventListener('click', () => seleccionar(div));
    cont.appendChild(div);
  }

  // Selecció prèvia
  const sel = estat.respostesUsuari[estat.index];
  if (sel) {
    const node = cont.querySelector(`[data-lletra="${sel}"]`);
    if (node) node.className = estilOpcio + ' ' + estilSeleccionada + ' opcio';
  }

  // Botons / avisos
  document.getElementById('btnAnterior').disabled = estat.index === 0;
  document.getElementById('btnSeguent').disabled = estat.index === estat.preguntes.length - 1;
  document.getElementById('avis').textContent = sel ? '' : 'Tria una opció.';
}

function seleccionar(div) {
  const cont = document.getElementById('opcions');
  cont.querySelectorAll('.opcio').forEach(o => o.className = estilOpcio + ' opcio');
  div.className = estilOpcio + ' ' + estilSeleccionada + ' opcio';

  const lletra = div.dataset.lletra;
  estat.respostesUsuari[estat.index] = lletra;

  // Comptar 1 intent per pregunta (només la primera vegada que es respon)
  if (estat.mode === 'practica' && estat.user?.uid) {
    if (!estat.counted[estat.index]) {
      estat.counted[estat.index] = true;
      const stage = estat.stage || 'practice';
      incProgress(estat.user.uid, stage);
      incTotalProgress(estat.user.uid);
    }
  }

  document.getElementById('avis').textContent = '';

  // Correcció immediata en pràctica
  if (estat.mode === 'practica') {
    const correcte = estat.preguntes[estat.index].resposta;
    cont.querySelectorAll('.opcio').forEach(o => {
      if (o.dataset.lletra === correcte) o.className = estilOpcio + ' ' + estilCorrecta + ' opcio';
      else if (o.dataset.lletra === lletra) o.className = estilOpcio + ' ' + estilIncorrecta + ' opcio';
    });
  }
}

export function anterior() {
  if (estat.index > 0) {
    estat.index--;
    pintarPregunta();
  }
}

export function seguent() {
  if (estat.index < estat.preguntes.length - 1) {
    estat.index++;
    pintarPregunta();
  }
}

export async function acabar() {
  const endTs = Date.now();

  const report = buildReport({
    user: estat.user,
    mode: (estat.mode === 'convocatoria') ? 'convocatoria' : 'practica',
    convocatoria: (estat.mode === 'convocatoria') ? estat.convocatoria : null,
    preguntes: estat.preguntes,
    respostesUsuari: estat.respostesUsuari,
    startTs: estat.startTs,
    endTs
  });

// ✅ Feedback immediat (popup central) — recompensa per prova individual//if (report.percentatge >= 60) {
 if (report.percentatge >= 60) {
  showCenterToast(
    "Enhorabona, estàs en el bon camí. No deixis de practicar i sobretot parla en català!",
    "ok",
    6000
  );
} else {
  showCenterToast(
    "Bon intent! Continua practicant: l'objectiu és arribar al 60%.",
    "warn",
    4500
  );
}

  // Després de construir report (ja tens report.percentatge)
if (report.percentatge >= 60) {
  showToast("🎉 Enhorabona, estàs en el bon camí. No deixis de practicar i sobretot parla en català!", "ok", 5000);
} else {
  showToast("💪 Bon intent! Continua practicant: l’objectiu és arribar al 60%.", "err", 3500);
}
  try {
    if (report.uid && report.email) {
      await saveAttempt(report);
      showToast('Les vostres dades s’han enregistrat correctament.', 'ok');
    }
  } catch (e) {
    console.warn('No s’ha pogut desar l’intent:', e);
    showToast("No s'han pogut desar les dades. Torna-ho a provar.", 'err', 3200);
  }

  const rows = report.errors.map(d => {
    const enu = estat.preguntes[d.pregunta - 1]?.enunciat || '';
    return `
      <div class="p-4 rounded-xl border border-red-300 bg-red-500/10">
        <div class="font-bold text-lg mb-2">${d.pregunta}. ${escapeHtml(enu)}</div>
        <div class="text-lg">La teva: <strong>${escapeHtml(d.respostaUsuari ?? '-')}</strong></div>
        <div class="text-lg">Correcta: <strong>${escapeHtml(d.respostaCorrecta)}</strong></div>
        <div class="text-sm text-gray-200 mt-1">Categoria: ${escapeHtml(d.categoria)}</div>
      </div>`;
  }).join('');

  const okRows = report.errors.length === 0
    ? `<div class="p-4 rounded-xl border border-green-300 bg-green-500/10 text-lg">✅ Cap errada. Molt bé!</div>`
    : rows;

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-6">
      <div class="glass-card max-w-4xl w-full p-10 text-white">
        <h2 class="text-4xl font-heading font-bold mb-3">Resultats</h2>
        <p class="text-2xl mb-2">Encerts: <strong>${report.encerts}</strong> / ${report.total} · <strong>${report.percentatge}%</strong></p>
        <p class="text-lg mb-7">Blancs: <strong>${report.blancs}</strong>${report.tempsSegons != null ? ` · Temps: <strong>${report.tempsSegons}s</strong>` : ''}</p>

        <div class="flex gap-4 mb-8 flex-wrap">
          <a class="bg-blue-600 hover:bg-blue-500 text-white px-7 py-4 text-xl rounded-xl font-bold" href="#/home">Tornar a l’inici</a>
          <a class="bg-white/15 hover:bg-white/25 text-white px-7 py-4 text-xl rounded-xl font-bold" href="#/darrera">Veure darrera prova</a>
          <a class="bg-white/15 hover:bg-white/25 text-white px-7 py-4 text-xl rounded-xl font-bold" href="#/estadistica">Estadística</a>
        </div>

        <h3 class="text-2xl font-bold mb-4">Detall d'errades</h3>
        <div class="space-y-4">${okRows}</div>
      </div>
    </div>`;
}
