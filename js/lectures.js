// lectures.js — Àrea 1 · Comprensió escrita
// ✅ PDF sempre visible (iframe creat amb DOM)
// ✅ 5 preguntes per lectura
// ✅ Correcció global (X/5)
// ✅ ≥3 encerts = prova superada
// ✅ Sense pistes ni errades
// ✅ Resultat desat a RTDB (mode: "practica")
// ✅ Evita dobles escriptures

import {
  AREA1_LECTURES_BY_CONVOCATORIA
} from "./lectures/index_lectures_area1.js";

import { auth, rtdb } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { showCenterToast } from "./centerToast.js";

/* ===================== Estat ===================== */

let lecturaDesada = false;

/* ===================== Utils ===================== */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Extreu una ruta de PDF vàlida a partir de lectura.pdf (sigui com sigui)
function getPdfPath(lectura) {
  if (!lectura || !lectura.pdf) return "";
  return String(lectura.pdf)
    .replace(/\s+/g, "")   // elimina salts de línia i espais
    .trim();
}

/* ===================== INIT ===================== */

export function initLectures(convId = null, lecturaId = null) {
  const titleEl = document.getElementById("a1Title");
  const mainEl = document.getElementById("a1Block1");
  if (!mainEl) return;

  mainEl.innerHTML = "";
// Amaga el botó de correcció global (oral) si existeix
const finishBtn = document.getElementById("a1FinishBtn");
if (finishBtn) finishBtn.style.display = "none";
// Ajustar el botó "Enrere" perquè torni a comprensions escrites
const backBtn = document.getElementById("a1BackBtn");
if (backBtn) {
  backBtn.onclick = () => {
    location.hash = "#/lectures";
  };
}

  /* ---------- Vista 1: convocatòries ---------- */
  if (!convId) {
    titleEl.textContent = "Àrea 1 · Comprensió escrita";

    AREA1_LECTURES_BY_CONVOCATORIA.forEach(bloc => {
      const a = document.createElement("a");
      a.href = `#/lectures/${bloc.convocatoria}`;
      a.className =
        "block mb-4 p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition";

      a.innerHTML = `
        <div class="text-lg font-bold">${bloc.convocatoria}</div>
        <div class="text-sm opacity-80">
          ${bloc.lectures.length} lectures ·
          ${bloc.lectures.reduce((n,l)=>n+l.preguntes.length,0)} preguntes
        </div>
      `;

      mainEl.appendChild(a);
    });

    return;
  }

  const bloc = AREA1_LECTURES_BY_CONVOCATORIA
    .find(b => b.convocatoria === convId);

  if (!bloc) {
    titleEl.textContent = "Convocatòria no trobada";
    return;
  }

  /* ---------- Vista 2: llista de lectures ---------- */
  if (!lecturaId) {
    titleEl.textContent = `Àrea 1 · Comprensió escrita (${convId})`;

    bloc.lectures.forEach(l => {
      const a = document.createElement("a");
      a.href = `#/lectures/${convId}/${l.id}`;
      a.className =
        "block mb-4 p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition";

      a.innerHTML = `
        <div class="text-lg font-bold">${escapeHtml(l.titol)}</div>
        <div class="text-sm opacity-80">5 preguntes</div>
      `;

      mainEl.appendChild(a);
    });

    return;
  }

  /* ---------- Vista 3: lectura individual ---------- */
  const lectura = bloc.lectures.find(l => l.id === lecturaId);
  if (!lectura) {
    titleEl.textContent = "Lectura no trobada";
    return;
  }

  // 🔁 Reset del flag per a cada lectura nova
  lecturaDesada = false;

  titleEl.textContent = `${escapeHtml(lectura.titol)} (${convId})`;

  /* ---------- PDF (robust i genèric) ---------- */
  const pdfPath = getPdfPath(lectura);

  const pdfWrap = document.createElement("div");
  pdfWrap.className = "mb-6";

  const iframe = document.createElement("iframe");
  iframe.src = pdfPath;
  iframe.width = "100%";
  iframe.height = "600";
  iframe.loading = "lazy";
  iframe.style.border = "1px solid rgba(255,255,255,0.2)";

  const download = document.createElement("a");
  download.href = pdfPath;
  download.target = "_blank";
  download.download = "";
  download.textContent = "⬇️ Descarregar PDF";
  download.className = "inline-block mt-3";

  pdfWrap.appendChild(iframe);
  pdfWrap.appendChild(download);
  mainEl.appendChild(pdfWrap);

  /* ---------- Preguntes ---------- */
  lectura.preguntes.forEach(q => {
    const div = document.createElement("div");
    div.className = "mb-4";

    div.innerHTML = `
      <div class="font-medium mb-1">
        ${q.numero}. ${escapeHtml(q.enunciat)}
      </div>

      ${Object.entries(q.opcions).map(([k,v]) => `
        <label class="block ml-4">
          <input type="radio" name="q${q.numero}" value="${k}">
          ${k}) ${escapeHtml(v)}
        </label>
      `).join("")}
    `;

    mainEl.appendChild(div);
  });

  /* ---------- Botó corregir ---------- */
  const btn = document.createElement("button");
  btn.textContent = "✅ Corregir lectura";
  btn.className = "mt-6 px-6 py-3 bg-green-600 rounded-xl font-bold";
  btn.onclick = async () => corregirLectura(convId, lectura);

  mainEl.appendChild(btn);
}

/* ===================== Correcció ===================== */

async function corregirLectura(convId, lectura) {
  let encerts = 0;
  let blancs = 0;

  lectura.preguntes.forEach(q => {
    const triat =
      document.querySelector(`input[name="q${q.numero}"]:checked`)?.value ?? null;

    if (!triat) {
      blancs++;
    } else if (q.anulada || q.resposta === "*" || triat === q.resposta) {
      encerts++;
    }
  });

  const superada = encerts >= 3;

  showCenterToast(
    superada
      ? "✅ Enhorabona, prova superada!"
      : "❌ Bon intent! Torna-ho a provar.",
    superada ? "ok" : "warn",
    4500
  );

  const resultBox = document.createElement("div");
  resultBox.className =
    "mt-6 p-4 rounded-xl bg-white/10 border border-white/20 font-semibold";
  resultBox.textContent = `Resultat: ${encerts} / 5`;
  mainElAppend(resultBox);

  const user = auth.currentUser;
  if (user && !lecturaDesada) {
    await push(ref(rtdb, `users/${user.uid}/attempts`), {
      uid: user.uid,
      email: user.email,
      area: 1,
      mode: "practica",
      convocatoria: convId,
      lecturaId: lectura.id,
      encerts,
      total: 5,
      blancs,
      timestamp: Date.now()
    });

    lecturaDesada = true;
  }
}

/* ===================== Helper DOM ===================== */

function mainElAppend(el) {
  const mainEl = document.getElementById("a1Block1");
  if (mainEl) mainEl.appendChild(el);
}

const backBtn = document.getElementById("a1BackBtn");
if (backBtn) {
  backBtn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      location.hash = "#/practica";
    },
    true // 👈 CAPTURA: això és la clau
  );
}