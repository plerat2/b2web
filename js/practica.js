// practica.js — Preparació de preguntes (mode pràctica)
// - tipus: 'nou'  => usa el banc 2027_practica.js (mateix directori)
// - tipus: 'real' => carrega convocatòries (anys) via loader.js

import { loadConvocatoria } from './loader.js';
import { shuffle } from './utils.js';
import { preguntes2027 as preguntes2027Raw } from './2027_practica.js';

// Categories visibles a la UI (etiquetes)
export const CATEGORIES = [
  'Fonètica',
  'Ortografia',
  'Gramàtica',
  'Vocabulari',
  'Literatura',
  'Dialectologia',
  'Sociolingüística'
];

// Mapatge UI -> dades (categories reals dins els bancs)
function uiToDataCategory(label) {
  const s = String(label || '').trim().toLowerCase();
  if (s === 'fonètica') return 'fonètica';
  if (s === 'ortografia') return 'ortografia';
  if (s === 'gramàtica') return 'gramàtica';
  if (s === 'vocabulari' || s === 'lèxic' || s === 'lexic') return 'Lèxic';
  if (s === 'literatura') return 'Literatura';
  if (s === 'dialectologia') return 'dialectologia';
  if (s === 'sociolingüística' || s === 'sociolinguistica') return 'sociolingüística';
  return String(label || '').trim();
}

// Normalitza la categoria que arriba d'un banc (per poder comparar)
function normDataCategory(cat) {
  const c = String(cat || '').trim();
  const low = c.toLowerCase();
  if (low === 'lèxic' || low === 'lexic') return 'Lèxic';
  if (low === 'literatura') return 'Literatura';
  if (low === 'sociolingüística' || low === 'sociolinguistica') return 'sociolingüística';
  if (low === 'dialectologia') return 'dialectologia';
  if (low === 'fonètica') return 'fonètica';
  if (low === 'ortografia') return 'ortografia';
  if (low === 'gramàtica') return 'gramàtica';
  return c;
}

// Adaptador perquè el motor (app.js) pugui treballar amb un format homogeni:
// { convocatoria, categoria, enunciat, opcions:{A,B,C,D}, resposta:'A' }
function adaptQuestion(q) {
  // Si ja ve en format del motor, no tocam res
  if (q && q.opcions && q.resposta) return q;

  return {
    convocatoria: q?.convocatoria ?? 'ens 2027',
    categoria: q?.categoria ?? '—',
    enunciat: q?.enunciat ?? '',
    opcions: {
      A: q?.opcioA ?? '',
      B: q?.opcioB ?? '',
      C: q?.opcioC ?? '',
      D: q?.opcioD ?? ''
    },
    resposta: q?.correcta ?? q?.resposta ?? ''
  };
}

// =============== POPUP AVÍS + FRASES (cada vegada) ===============
const PRACTICE_QUOTES = [
  'Sempre sembla impossible fins que es fa.',
  'L’únic impossible és allò que no intentes.',
  'El que és impossible només triga una mica més.',
  'No diguis: “és impossible”, digues: “no ho he fet encara”.',
  'Com no sabia que era impossible, ho vaig fer.'
];

function pickRandomQuote() {
  return PRACTICE_QUOTES[Math.floor(Math.random() * PRACTICE_QUOTES.length)];
}

function ensurePracticeModalExists() {
  // CSS (injectat una vegada)
  if (!document.getElementById('practiceModalStyles')) {
    const style = document.createElement('style');
    style.id = 'practiceModalStyles';
    style.textContent = `
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:9999;padding:16px}
      .modal-overlay.hidden{display:none}
      .modal-box{width:min(520px,95vw);background:#fff;border-radius:14px;padding:18px 18px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);position:relative;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      .modal-title{margin:0 32px 10px 0;font-size:20px}
      .modal-text{margin:8px 0;line-height:1.35;font-size:15px}
      .modal-sep{border:0;border-top:1px solid #e6e6e6;margin:12px 0}
      .modal-quote{margin:10px 0 0;font-style:italic;color:#333;line-height:1.35}
      .modal-actions{display:flex;justify-content:flex-end;margin-top:14px}
      .modal-ok{background:#1a73e8;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer}
      .modal-ok:hover{background:#155fc1}
      .modal-close{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:10px;border:0;background:#f1f1f1;cursor:pointer;font-size:22px;line-height:1}
      .modal-close:hover{background:#e7e7e7}
    `;
    document.head.appendChild(style);
  }

  // HTML (injectat una vegada)
  if (!document.getElementById('practiceModalOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'practiceModalOverlay';
    overlay.className = 'modal-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-box" role="document">
        <button id="practiceModalClose" class="modal-close" aria-label="Tanca">×</button>
        <h2 class="modal-title">Avís important</h2>
        <p class="modal-text">Has d’arribar a 100 preguntes d’entrenament per desbloquejar la pràctica i a 100 de pràctica per desbloquejar convocatòries.</p>
        <p class="modal-text"><strong>Ànims, bon aprenentatge!</strong></p>
        <hr class="modal-sep" />
        <p id="practiceModalQuote" class="modal-quote"></p>
        <div class="modal-actions">
          <button id="practiceModalOk" class="modal-ok">Entesos, comencem</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

export function mostrarAvisPractica() {
  ensurePracticeModalExists();
  const overlay = document.getElementById('practiceModalOverlay');
  const quoteEl = document.getElementById('practiceModalQuote');
  const btnOk = document.getElementById('practiceModalOk');
  const btnClose = document.getElementById('practiceModalClose');

  quoteEl.textContent = '— ' + pickRandomQuote();
  overlay.classList.remove('hidden');

  function close() {
    overlay.classList.add('hidden');
    btnOk.removeEventListener('click', close);
    btnClose.removeEventListener('click', close);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  btnOk.addEventListener('click', close);
  btnClose.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  setTimeout(() => btnOk.focus(), 0);
}

// ======================= PREPARAR PREGUNTES =======================
export async function prepararPractica({
  tipus = 'nou',
  cats = [],
  n = 30,
  mixYears = false,
  yearSelected = 2027
} = {}) {

  const useCatsUI = (cats && cats.length) ? cats : CATEGORIES;
  const wanted = new Set(useCatsUI.map(uiToDataCategory));

  // 1) NOU (banc 2027)
  if (tipus === 'nou') {
    const adapted = preguntes2027Raw
      .map(adaptQuestion)
      .map(q => ({ ...q, categoria: normDataCategory(q.categoria) }));

    const filtered = adapted.filter(q => wanted.has(normDataCategory(q.categoria)));
    shuffle(filtered);
    return filtered.slice(0, Number(n));
  }

  // 2) REAL (convocatòries)
  const anys = mixYears
    ? [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026]
    : [Number(yearSelected)];

  const pool = [];
  for (const a of anys) {
    const qs = await loadConvocatoria(String(a));
    if (Array.isArray(qs)) pool.push(...qs);
  }

  const filtered = pool
    .map(adaptQuestion)
    .map(q => ({ ...q, categoria: normDataCategory(q.categoria) }))
    .filter(q => wanted.has(normDataCategory(q.categoria)));

  shuffle(filtered);
  return filtered.slice(0, Number(n));
}
